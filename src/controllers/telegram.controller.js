import TelegramBot from 'node-telegram-bot-api';
import pool from '../config/db.js';

// Map to store bot instances
const botInstances = new Map();

// Initialize bot instance
const initBot = async (botToken) => {
    if (!botInstances.has(botToken)) {
        const bot = new TelegramBot(botToken, { polling: false });
        botInstances.set(botToken, bot);
        return bot;
    }
    return botInstances.get(botToken);
};

// Test bot connection
export const testBotConnection = async (req, res) => {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            return res.status(400).json({ error: 'Telegram bot token not configured' });
        }

        const bot = await initBot(botToken);
        const botInfo = await bot.getMe();
        
        res.json({
            success: true,
            bot_info: {
                id: botInfo.id,
                username: botInfo.username,
                first_name: botInfo.first_name,
                can_join_groups: botInfo.can_join_groups,
                can_read_all_group_messages: botInfo.can_read_all_group_messages,
                supports_inline_queries: botInfo.supports_inline_queries
            }
        });
    } catch (error) {
        console.error('Error testing bot connection:', error);
        res.status(500).json({ 
            error: 'Failed to connect to Telegram bot',
            details: error.message 
        });
    }
};

// Admin Controllers
export const addBot = async (req, res) => {
    const { bot_token } = req.body;
    
    try {
        // Verify bot token by getting bot info
        const bot = await initBot(bot_token);
        const botInfo = await bot.getMe();
        
        const result = await pool.query(
            'INSERT INTO telegram_bots (bot_token, bot_name) VALUES ($1, $2) RETURNING *',
            [bot_token, botInfo.username]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error adding bot:', error);
        res.status(400).json({ error: 'Invalid bot token or bot already exists' });
    }
};

export const listBots = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.id, b.bot_name, b.status, 
                   json_agg(json_build_object('agent_id', a.agent_id, 'status', a.status)) as assignments
            FROM telegram_bots b
            LEFT JOIN telegram_bot_assignments a ON b.id = a.bot_id
            GROUP BY b.id, b.bot_name, b.status
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing bots:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const assignBot = async (req, res) => {
    const { id } = req.params;
    const { agent_id } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO telegram_bot_assignments (bot_id, agent_id) VALUES ($1, $2) RETURNING *',
            [id, agent_id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error assigning bot:', error);
        res.status(400).json({ error: 'Invalid bot ID or agent ID, or assignment already exists' });
    }
};

export const deleteBot = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Check if bot has any active messages
        const messageCheck = await pool.query(
            'SELECT EXISTS(SELECT 1 FROM telegram_messages WHERE bot_id = $1)',
            [id]
        );
        
        if (messageCheck.rows[0].exists) {
            return res.status(400).json({ error: 'Cannot delete bot with existing messages' });
        }
        
        // Soft delete the bot
        const result = await pool.query(
            'UPDATE telegram_bots SET status = $1 WHERE id = $2 RETURNING *',
            ['deleted', id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        res.json({ message: 'Bot deleted successfully' });
    } catch (error) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Agent Controllers
export const listAgentBots = async (req, res) => {
    const agentId = req.user.id; // Assuming user info is set by auth middleware
    
    try {
        const result = await pool.query(`
            SELECT b.id, b.bot_name
            FROM telegram_bots b
            INNER JOIN telegram_bot_assignments a ON b.id = a.bot_id
            WHERE a.agent_id = $1 AND a.status = 'active' AND b.status = 'active'
        `, [agentId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing agent bots:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const sendMessage = async (req, res) => {
    const { bot_id, chat_id, message } = req.body;
    const agentId = req.user.id;
    
    try {
        // Verify agent has access to this bot
        const botAccess = await pool.query(`
            SELECT b.bot_token
            FROM telegram_bots b
            INNER JOIN telegram_bot_assignments a ON b.id = a.bot_id
            WHERE b.id = $1 AND a.agent_id = $2 AND a.status = 'active' AND b.status = 'active'
        `, [bot_id, agentId]);
        
        if (botAccess.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized access to this bot' });
        }
        
        const bot = await initBot(botAccess.rows[0].bot_token);
        const sentMessage = await bot.sendMessage(chat_id, message);
        
        // Log the message
        await pool.query(
            'INSERT INTO telegram_messages (bot_id, chat_id, message, direction, message_id) VALUES ($1, $2, $3, $4, $5)',
            [bot_id, chat_id, message, 'outgoing', sentMessage.message_id]
        );
        
        res.json({ success: true, message_id: sentMessage.message_id });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

export const broadcast = async (req, res) => {
    const { bot_id, chat_ids, message } = req.body;
    const agentId = req.user.id;
    
    try {
        // Verify agent has access to this bot
        const botAccess = await pool.query(`
            SELECT b.bot_token
            FROM telegram_bots b
            INNER JOIN telegram_bot_assignments a ON b.id = a.bot_id
            WHERE b.id = $1 AND a.agent_id = $2 AND a.status = 'active' AND b.status = 'active'
        `, [bot_id, agentId]);
        
        if (botAccess.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized access to this bot' });
        }
        
        const bot = await initBot(botAccess.rows[0].bot_token);
        const results = [];
        
        for (const chat_id of chat_ids) {
            try {
                const sentMessage = await bot.sendMessage(chat_id, message);
                
                // Log the message
                await pool.query(
                    'INSERT INTO telegram_messages (bot_id, chat_id, message, direction, message_id) VALUES ($1, $2, $3, $4, $5)',
                    [bot_id, chat_id, message, 'outgoing', sentMessage.message_id]
                );
                
                results.push({ chat_id, status: 'success', message_id: sentMessage.message_id });
            } catch (error) {
                results.push({ chat_id, status: 'failed', error: error.message });
            }
        }
        
        res.json({ results });
    } catch (error) {
        console.error('Error broadcasting message:', error);
        res.status(500).json({ error: 'Failed to broadcast message' });
    }
}; 
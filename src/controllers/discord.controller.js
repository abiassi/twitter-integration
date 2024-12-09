import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import pool from '../config/db.js';

// Initialize Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Channel]
});

// Initialize REST API client for Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Bot event handlers
client.once('ready', () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    try {
        // Log command execution
        await pool.query(
            'INSERT INTO discord_command_logs (command_id, discord_user_id, server_id, channel_id, arguments) VALUES ((SELECT id FROM discord_commands WHERE name = $1), $2, $3, $4, $5)',
            [interaction.commandName, interaction.user.id, interaction.guildId, interaction.channelId, JSON.stringify(interaction.options)]
        );

        // Handle commands
        switch (interaction.commandName) {
            case 'balance':
                await handleBalanceCommand(interaction);
                break;
            case 'nft':
                await handleNFTCommand(interaction);
                break;
            case 'vote':
                await handleVoteCommand(interaction);
                break;
            default:
                await interaction.reply('Unknown command');
        }
    } catch (error) {
        console.error('Command execution error:', error);
        await interaction.reply({ content: 'An error occurred while executing the command', ephemeral: true });
    }
});

// Authentication endpoints
export const getAuthUrl = (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=${process.env.DISCORD_PERMISSIONS}&scope=bot%20applications.commands%20identify%20guilds`;
    res.json({ auth_url: authUrl });
};

export const handleCallback = async (req, res) => {
    const { code } = req.query;
    const agentId = req.user.id;
    
    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.DISCORD_CALLBACK_URL,
                scope: 'identify guilds'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokens = await tokenResponse.json();
        
        // Get user info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`
            }
        });
        
        const userInfo = await userResponse.json();
        
        // Store account info
        const result = await pool.query(
            'INSERT INTO discord_accounts (agent_id, discord_user_id, username, discriminator, access_token, refresh_token, token_expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [
                agentId,
                userInfo.id,
                userInfo.username,
                userInfo.discriminator,
                tokens.access_token,
                tokens.refresh_token,
                new Date(Date.now() + tokens.expires_in * 1000)
            ]
        );
        
        res.json({
            success: true,
            account: {
                id: result.rows[0].id,
                username: userInfo.username
            }
        });
    } catch (error) {
        console.error('Discord auth error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Discord' });
    }
};

// Server management
export const listServers = async (req, res) => {
    const { account_id } = req.params;
    
    try {
        const account = await pool.query('SELECT access_token FROM discord_accounts WHERE id = $1', [account_id]);
        if (!account.rows.length) {
            return res.status(404).json({ error: 'Discord account not found' });
        }
        
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${account.rows[0].access_token}`
            }
        });
        
        const servers = await response.json();
        
        // Update local database with server info
        for (const server of servers) {
            await pool.query(
                `INSERT INTO discord_servers (discord_server_id, name, description, icon_url, member_count)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (discord_server_id) DO UPDATE
                 SET name = $2, description = $3, icon_url = $4, member_count = $5, last_synced_at = CURRENT_TIMESTAMP`,
                [server.id, server.name, server.description, server.icon, server.approximate_member_count]
            );
        }
        
        res.json(servers);
    } catch (error) {
        console.error('Server list error:', error);
        res.status(500).json({ error: 'Failed to fetch Discord servers' });
    }
};

// Channel management
export const createChannel = async (req, res) => {
    const { server_id, name, type } = req.body;
    
    try {
        const server = await pool.query('SELECT discord_server_id FROM discord_servers WHERE id = $1', [server_id]);
        if (!server.rows.length) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        const channel = await client.guilds.cache.get(server.rows[0].discord_server_id).channels.create({
            name,
            type
        });
        
        const result = await pool.query(
            'INSERT INTO discord_channels (server_id, discord_channel_id, name, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [server_id, channel.id, name, type]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Channel creation error:', error);
        res.status(500).json({ error: 'Failed to create Discord channel' });
    }
};

// Role management
export const assignRole = async (req, res) => {
    const { server_id, user_id, role_name } = req.body;
    
    try {
        const server = await pool.query('SELECT discord_server_id FROM discord_servers WHERE id = $1', [server_id]);
        if (!server.rows.length) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        const guild = client.guilds.cache.get(server.rows[0].discord_server_id);
        const role = guild.roles.cache.find(r => r.name === role_name);
        
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        const member = await guild.members.fetch(user_id);
        await member.roles.add(role);
        
        // Log role assignment
        await pool.query(
            'INSERT INTO discord_role_assignments (role_id, discord_user_id, assigned_by_user_id) VALUES ($1, $2, $3)',
            [role.id, user_id, req.user.discord_id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Role assignment error:', error);
        res.status(500).json({ error: 'Failed to assign Discord role' });
    }
};

// Notifications
export const sendNotification = async (req, res) => {
    const { channel_id, content, type, metadata, schedule_time } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO discord_notifications (channel_id, type, content, metadata, scheduled_for) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [channel_id, type, content, metadata, schedule_time]
        );
        
        if (!schedule_time) {
            const channel = await pool.query('SELECT discord_channel_id FROM discord_channels WHERE id = $1', [channel_id]);
            if (!channel.rows.length) {
                return res.status(404).json({ error: 'Channel not found' });
            }
            
            const discordChannel = await client.channels.fetch(channel.rows[0].discord_channel_id);
            await discordChannel.send(content);
            
            await pool.query(
                'UPDATE discord_notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['sent', result.rows[0].id]
            );
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({ error: 'Failed to send Discord notification' });
    }
};

// Events
export const createEvent = async (req, res) => {
    const { server_id, name, description, start_time, end_time, channel_id } = req.body;
    
    try {
        const server = await pool.query('SELECT discord_server_id FROM discord_servers WHERE id = $1', [server_id]);
        if (!server.rows.length) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        const guild = client.guilds.cache.get(server.rows[0].discord_server_id);
        const event = await guild.scheduledEvents.create({
            name,
            description,
            scheduledStartTime: start_time,
            scheduledEndTime: end_time,
            privacyLevel: 2, // GUILD_ONLY
            entityType: 3, // EXTERNAL
            channel: channel_id
        });
        
        const result = await pool.query(
            'INSERT INTO discord_events (server_id, discord_event_id, name, description, start_time, end_time, channel_id, creator_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [server_id, event.id, name, description, start_time, end_time, channel_id, req.user.discord_id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Event creation error:', error);
        res.status(500).json({ error: 'Failed to create Discord event' });
    }
};

// Start the Discord bot
client.login(process.env.DISCORD_BOT_TOKEN)
    .catch(error => console.error('Discord bot login error:', error)); 
import snoowrap from 'snoowrap';
import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

// Map to store Reddit client instances
const redditClients = new Map();

// Initialize Reddit client
const initRedditClient = async (refreshToken) => {
    if (!redditClients.has(refreshToken)) {
        const client = new snoowrap({
            userAgent: process.env.REDDIT_USER_AGENT,
            clientId: process.env.REDDIT_CLIENT_ID,
            clientSecret: process.env.REDDIT_CLIENT_SECRET,
            refreshToken: refreshToken
        });
        redditClients.set(refreshToken, client);
        return client;
    }
    return redditClients.get(refreshToken);
};

// Authentication endpoints
export const getAuthUrl = (req, res) => {
    const authUrl = snoowrap.getAuthUrl({
        clientId: process.env.REDDIT_CLIENT_ID,
        scope: ['identity', 'edit', 'submit', 'read', 'history'],
        redirectUri: process.env.REDDIT_CALLBACK_URL,
        permanent: true,
        state: 'random-string'  // In production, use a secure random string
    });
    
    res.json({ auth_url: authUrl });
};

export const handleCallback = async (req, res) => {
    const { code } = req.query;
    const agentId = req.user.id;
    
    try {
        const tokenInfo = await snoowrap.fromAuthCode({
            code,
            userAgent: process.env.REDDIT_USER_AGENT,
            clientId: process.env.REDDIT_CLIENT_ID,
            clientSecret: process.env.REDDIT_CLIENT_SECRET,
            redirectUri: process.env.REDDIT_CALLBACK_URL
        });
        
        const client = new snoowrap(tokenInfo);
        const userInfo = await client.getMe();
        
        // Store account info in database
        const result = await pool.query(
            'INSERT INTO reddit_accounts (agent_id, username, refresh_token, access_token, token_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [agentId, userInfo.name, tokenInfo.refresh_token, tokenInfo.access_token, new Date(Date.now() + tokenInfo.expires_in * 1000)]
        );
        
        res.json({
            success: true,
            account: {
                id: result.rows[0].id,
                username: userInfo.name
            }
        });
    } catch (error) {
        console.error('Reddit auth error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Reddit' });
    }
};

// Subreddit management
export const searchSubreddits = async (req, res) => {
    const { query } = req.query;
    const accountId = req.query.account_id;
    
    try {
        const account = await pool.query('SELECT refresh_token FROM reddit_accounts WHERE id = $1', [accountId]);
        if (!account.rows.length) {
            return res.status(404).json({ error: 'Reddit account not found' });
        }
        
        const client = await initRedditClient(account.rows[0].refresh_token);
        const subreddits = await client.searchSubreddits({
            query,
            limit: 10
        });
        
        res.json(subreddits.map(sub => ({
            name: sub.display_name,
            title: sub.title,
            description: sub.public_description,
            subscribers: sub.subscribers,
            url: sub.url
        })));
    } catch (error) {
        console.error('Subreddit search error:', error);
        res.status(500).json({ error: 'Failed to search subreddits' });
    }
};

// Post management
export const createPost = async (req, res) => {
    const { account_id, subreddit, title, content, url, post_type, schedule_time } = req.body;
    
    try {
        // Get account info
        const account = await pool.query('SELECT refresh_token FROM reddit_accounts WHERE id = $1', [account_id]);
        if (!account.rows.length) {
            return res.status(404).json({ error: 'Reddit account not found' });
        }
        
        // Get or create subreddit record
        let subredditRecord = await pool.query('SELECT id FROM reddit_subreddits WHERE name = $1', [subreddit]);
        if (!subredditRecord.rows.length) {
            const client = await initRedditClient(account.rows[0].refresh_token);
            const subInfo = await client.getSubreddit(subreddit).fetch();
            
            subredditRecord = await pool.query(
                'INSERT INTO reddit_subreddits (name, display_name, description, subscribers) VALUES ($1, $2, $3, $4) RETURNING id',
                [subreddit, subInfo.display_name, subInfo.public_description, subInfo.subscribers]
            );
        }
        
        // Create post record
        const postResult = await pool.query(
            'INSERT INTO reddit_posts (account_id, subreddit_id, title, content, url, post_type, scheduled_for, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [account_id, subredditRecord.rows[0].id, title, content, url, post_type, schedule_time, schedule_time ? 'scheduled' : 'draft']
        );
        
        // If no schedule time, post immediately
        if (!schedule_time) {
            const client = await initRedditClient(account.rows[0].refresh_token);
            const subredditClient = client.getSubreddit(subreddit);
            
            let redditPost;
            if (post_type === 'link') {
                redditPost = await subredditClient.submitLink({ title, url });
            } else {
                redditPost = await subredditClient.submitSelfpost({ title, text: content });
            }
            
            await pool.query(
                'UPDATE reddit_posts SET reddit_post_id = $1, status = $2, posted_at = CURRENT_TIMESTAMP WHERE id = $3',
                [redditPost.id, 'posted', postResult.rows[0].id]
            );
        }
        
        res.json({
            success: true,
            post: postResult.rows[0]
        });
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};

// Analytics
export const getPostAnalytics = async (req, res) => {
    const { post_id } = req.params;
    
    try {
        const post = await pool.query(`
            SELECT p.*, a.username, s.name as subreddit_name,
                   (SELECT json_agg(pa.*)
                    FROM reddit_post_analytics pa
                    WHERE pa.post_id = p.id
                    ORDER BY pa.recorded_at DESC
                    LIMIT 24) as analytics
            FROM reddit_posts p
            JOIN reddit_accounts a ON p.account_id = a.id
            JOIN reddit_subreddits s ON p.subreddit_id = s.id
            WHERE p.id = $1
        `, [post_id]);
        
        if (!post.rows.length) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // If post is published, get latest data from Reddit
        if (post.rows[0].reddit_post_id) {
            const account = await pool.query('SELECT refresh_token FROM reddit_accounts WHERE id = $1', [post.rows[0].account_id]);
            const client = await initRedditClient(account.rows[0].refresh_token);
            const redditPost = await client.getSubmission(post.rows[0].reddit_post_id).fetch();
            
            // Record new analytics
            await pool.query(
                'INSERT INTO reddit_post_analytics (post_id, upvotes, downvotes, score, comment_count) VALUES ($1, $2, $3, $4, $5)',
                [post_id, redditPost.ups, redditPost.downs, redditPost.score, redditPost.num_comments]
            );
            
            // Update post stats
            await pool.query(
                'UPDATE reddit_posts SET upvotes = $1, downvotes = $2, comment_count = $3 WHERE id = $4',
                [redditPost.ups, redditPost.downs, redditPost.num_comments, post_id]
            );
        }
        
        res.json(post.rows[0]);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch post analytics' });
    }
};

// Notifications
export const getNotifications = async (req, res) => {
    const { account_id } = req.params;
    const { unread_only } = req.query;
    
    try {
        let query = 'SELECT * FROM reddit_notifications WHERE account_id = $1';
        const params = [account_id];
        
        if (unread_only === 'true') {
            query += ' AND read_at IS NULL';
        }
        
        query += ' ORDER BY created_at DESC LIMIT 50';
        
        const notifications = await pool.query(query, params);
        res.json(notifications.rows);
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Mark notifications as read
export const markNotificationsRead = async (req, res) => {
    const { notification_ids } = req.body;
    
    try {
        await pool.query(
            'UPDATE reddit_notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ANY($1)',
            [notification_ids]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notifications error:', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
}; 
-- Create the twitter_accounts table
CREATE TABLE IF NOT EXISTS twitter_accounts (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  access_secret TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  UNIQUE(agent_id, account_name)
);

-- Create an index on agent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_agent_id ON twitter_accounts(agent_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_twitter_accounts_updated_at
    BEFORE UPDATE ON twitter_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the telegram_bots table
CREATE TABLE IF NOT EXISTS telegram_bots (
    id SERIAL PRIMARY KEY,
    bot_token TEXT NOT NULL UNIQUE,
    bot_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted'))
);

-- Create the telegram_bot_assignments table
CREATE TABLE IF NOT EXISTS telegram_bot_assignments (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER REFERENCES telegram_bots(id),
    agent_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE(bot_id, agent_id)
);

-- Create the telegram_messages table
CREATE TABLE IF NOT EXISTS telegram_messages (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER REFERENCES telegram_bots(id),
    chat_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_id BIGINT,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_bot_assignments_agent_id ON telegram_bot_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_telegram_bot_assignments_bot_id ON telegram_bot_assignments(bot_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_bot_id ON telegram_messages(bot_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON telegram_messages(chat_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_telegram_bots_updated_at
    BEFORE UPDATE ON telegram_bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_bot_assignments_updated_at
    BEFORE UPDATE ON telegram_bot_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the reddit_accounts table
CREATE TABLE IF NOT EXISTS reddit_accounts (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
    UNIQUE(agent_id, username)
);

-- Create the reddit_subreddits table
CREATE TABLE IF NOT EXISTS reddit_subreddits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    subscribers INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    UNIQUE(name)
);

-- Create the reddit_posts table
CREATE TABLE IF NOT EXISTS reddit_posts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES reddit_accounts(id),
    subreddit_id INTEGER REFERENCES reddit_subreddits(id),
    reddit_post_id VARCHAR(255) NOT NULL,
    title VARCHAR(300) NOT NULL,
    content TEXT,
    url TEXT,
    post_type VARCHAR(50) CHECK (post_type IN ('text', 'link', 'image', 'video')),
    scheduled_for TIMESTAMP,
    posted_at TIMESTAMP,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reddit_post_id)
);

-- Create the reddit_post_analytics table
CREATE TABLE IF NOT EXISTS reddit_post_analytics (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES reddit_posts(id),
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    controversy_score FLOAT DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the reddit_comments table
CREATE TABLE IF NOT EXISTS reddit_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES reddit_posts(id),
    reddit_comment_id VARCHAR(255) NOT NULL,
    parent_comment_id INTEGER REFERENCES reddit_comments(id),
    content TEXT NOT NULL,
    author VARCHAR(255),
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reddit_comment_id)
);

-- Create the reddit_notifications table
CREATE TABLE IF NOT EXISTS reddit_notifications (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES reddit_accounts(id),
    type VARCHAR(50) CHECK (type IN ('comment', 'upvote', 'trending', 'ama')),
    content TEXT NOT NULL,
    reference_id TEXT,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_agent_id ON reddit_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_account_id ON reddit_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit_id ON reddit_posts(subreddit_id);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_status ON reddit_posts(status);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_post_id ON reddit_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_reddit_notifications_account_id ON reddit_notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_reddit_notifications_read_at ON reddit_notifications(read_at);

-- Add triggers for updated_at columns
CREATE TRIGGER update_reddit_accounts_updated_at
    BEFORE UPDATE ON reddit_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reddit_subreddits_updated_at
    BEFORE UPDATE ON reddit_subreddits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reddit_posts_updated_at
    BEFORE UPDATE ON reddit_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reddit_comments_updated_at
    BEFORE UPDATE ON reddit_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the discord_accounts table
CREATE TABLE IF NOT EXISTS discord_accounts (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    discord_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(4),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
    UNIQUE(agent_id, discord_user_id)
);

-- Create the discord_servers table
CREATE TABLE IF NOT EXISTS discord_servers (
    id SERIAL PRIMARY KEY,
    discord_server_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    member_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    UNIQUE(discord_server_id)
);

-- Create the discord_channels table
CREATE TABLE IF NOT EXISTS discord_channels (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES discord_servers(id),
    discord_channel_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'voice', 'category', 'announcement')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    UNIQUE(discord_channel_id)
);

-- Create the discord_roles table
CREATE TABLE IF NOT EXISTS discord_roles (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES discord_servers(id),
    discord_role_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color INTEGER,
    position INTEGER,
    permissions BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_role_id)
);

-- Create the discord_role_assignments table
CREATE TABLE IF NOT EXISTS discord_role_assignments (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES discord_roles(id),
    discord_user_id VARCHAR(255) NOT NULL,
    assigned_by_user_id VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'removed'))
);

-- Create the discord_commands table
CREATE TABLE IF NOT EXISTS discord_commands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    cooldown_seconds INTEGER DEFAULT 0,
    required_permissions TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- Create the discord_command_logs table
CREATE TABLE IF NOT EXISTS discord_command_logs (
    id SERIAL PRIMARY KEY,
    command_id INTEGER REFERENCES discord_commands(id),
    discord_user_id VARCHAR(255) NOT NULL,
    server_id INTEGER REFERENCES discord_servers(id),
    channel_id INTEGER REFERENCES discord_channels(id),
    arguments JSONB,
    response_status VARCHAR(50),
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the discord_notifications table
CREATE TABLE IF NOT EXISTS discord_notifications (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES discord_channels(id),
    type VARCHAR(50) CHECK (type IN ('transaction', 'nft_mint', 'governance', 'event', 'announcement')),
    content TEXT NOT NULL,
    metadata JSONB,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the discord_events table
CREATE TABLE IF NOT EXISTS discord_events (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES discord_servers(id),
    discord_event_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    channel_id INTEGER REFERENCES discord_channels(id),
    creator_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_event_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_discord_accounts_agent_id ON discord_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_discord_accounts_discord_user_id ON discord_accounts(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_discord_channels_server_id ON discord_channels(server_id);
CREATE INDEX IF NOT EXISTS idx_discord_roles_server_id ON discord_roles(server_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_assignments_role_id ON discord_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_assignments_discord_user_id ON discord_role_assignments(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_discord_command_logs_command_id ON discord_command_logs(command_id);
CREATE INDEX IF NOT EXISTS idx_discord_notifications_channel_id ON discord_notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_notifications_status ON discord_notifications(status);
CREATE INDEX IF NOT EXISTS idx_discord_events_server_id ON discord_events(server_id);
CREATE INDEX IF NOT EXISTS idx_discord_events_start_time ON discord_events(start_time);

-- Add triggers for updated_at columns
CREATE TRIGGER update_discord_accounts_updated_at
    BEFORE UPDATE ON discord_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_servers_updated_at
    BEFORE UPDATE ON discord_servers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_channels_updated_at
    BEFORE UPDATE ON discord_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_roles_updated_at
    BEFORE UPDATE ON discord_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_commands_updated_at
    BEFORE UPDATE ON discord_commands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_notifications_updated_at
    BEFORE UPDATE ON discord_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_events_updated_at
    BEFORE UPDATE ON discord_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

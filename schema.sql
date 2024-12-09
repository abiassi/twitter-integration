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

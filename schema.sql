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

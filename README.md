# Social Media Integration Hub

A comprehensive Node.js API service that provides unified integration with multiple social media platforms:
- Twitter (X)
- Telegram
- Reddit
- Discord

Perfect for Web3 projects, community management, and social media automation.

## Features

### Twitter Integration
- OAuth 2.0 authentication
- Post tweets and manage timeline
- Like and retweet functionality
- Account management
- Timeline retrieval

### Telegram Bot Management
- Bot creation and management
- Message sending and broadcasting
- User interaction logging
- Multi-bot support
- Agent assignment system

### Reddit Integration
- OAuth 2.0 authentication
- Subreddit management
- Post creation and scheduling
- Analytics tracking
- Notification system

### Discord Integration
- OAuth 2.0 and bot integration
- Server and channel management
- Role management and automation
- Custom commands for Web3
- Event management
- Notification system

## Prerequisites

- Node.js (v18.15.0 or higher)
- PostgreSQL (v13 or higher)
- ngrok (for development webhook support)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/social-media-hub.git
   cd social-media-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a PostgreSQL database:
   ```bash
   createdb social_integration
   ```

4. Run database migrations:
   ```bash
   psql -d social_integration -f schema.sql
   ```

5. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your credentials:

   ```env
   # Database Configuration
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=social_integration
   DB_PASSWORD=your_db_password
   DB_PORT=5432

   # Twitter Configuration
   TWITTER_CLIENT_ID=your_twitter_client_id
   TWITTER_CLIENT_SECRET=your_twitter_client_secret
   TWITTER_CALLBACK_URL=your_callback_url

   # Telegram Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token

   # Reddit Configuration
   REDDIT_CLIENT_ID=your_reddit_client_id
   REDDIT_CLIENT_SECRET=your_reddit_client_secret
   REDDIT_CALLBACK_URL=your_callback_url
   REDDIT_USER_AGENT=web3_app:v1.0.0 (by /u/your_username)

   # Discord Configuration
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_CALLBACK_URL=your_callback_url
   DISCORD_PERMISSIONS=8  # Administrator permissions

   # General Configuration
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:5173
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Platform Setup

### Twitter Setup
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Enable OAuth 2.0
4. Add callback URL
5. Get Client ID and Secret
6. Update `.env` file

### Telegram Setup
1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot
3. Get the bot token
4. Update `.env` file

### Reddit Setup
1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Create a new app (type: web app)
3. Get Client ID and Secret
4. Update `.env` file

### Discord Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Add a bot
4. Enable required intents:
   - Message Content Intent
   - Server Members Intent
   - Presence Intent
5. Get tokens and update `.env` file

## API Documentation

### Twitter Endpoints

#### Authentication
- `GET /api/twitter/connect/twitter` - Get authentication URL
- `GET /api/twitter/callback/twitter` - OAuth callback

#### Timeline
- `GET /api/twitter/timeline` - Get user timeline
  ```bash
  curl "http://localhost:3000/api/twitter/timeline?maxResults=3"
  ```

#### Tweets
- `POST /api/twitter/tweet` - Post a new tweet
  ```bash
  curl -X POST http://localhost:3000/api/twitter/tweet \
    -H "Content-Type: application/json" \
    -d '{"account_id": 1, "text": "Hello from API!"}'
  ```

### Telegram Endpoints

#### Bot Management
- `POST /api/admin/telegram/bots` - Add new bot
- `GET /api/admin/telegram/bots` - List all bots
- `PUT /api/admin/telegram/bots/:id/assign` - Assign bot to agent
- `DELETE /api/admin/telegram/bots/:id` - Remove bot

#### Messaging
- `POST /api/telegram/messages` - Send message
- `POST /api/telegram/broadcast` - Send broadcast

### Reddit Endpoints

#### Authentication
- `GET /api/reddit/auth` - Get authentication URL
- `GET /api/reddit/callback` - OAuth callback

#### Posts
- `POST /api/reddit/posts` - Create post
- `GET /api/reddit/posts/:post_id/analytics` - Get post analytics

### Discord Endpoints

#### Authentication
- `GET /api/discord/auth` - Get authentication URL
- `GET /api/discord/callback` - OAuth callback

#### Server Management
- `GET /api/discord/accounts/:account_id/servers` - List servers
- `POST /api/discord/channels` - Create channel
- `POST /api/discord/roles/assign` - Assign role

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
# Create new migration
psql -d social_integration -f migrations/new_migration.sql

# Reset database
psql -d social_integration -f schema.sql
```

## Production Deployment

1. Set environment variables for production
2. Build the application:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Security Considerations

- All endpoints are protected with authentication
- Rate limiting is implemented
- Input validation on all endpoints
- Secure token storage
- CORS protection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- Twitter API v2
- Telegram Bot API
- Reddit API
- Discord.js
- Express.js
- PostgreSQL
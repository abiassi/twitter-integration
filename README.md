# Social Media Integration API

A Node.js API service that provides integration with Twitter, Telegram, and Reddit platforms, allowing agents to manage social media accounts, bots, and engage with communities.

## Features

### Telegram Bot Management

#### Admin Features
- **Bot Management**
  - Add new Telegram bots to the platform
  - List all bots and their assigned agents
  - Assign bots to specific agents
  - Remove bots from the platform (with safety checks)

#### Agent Features
- **Bot Access**
  - View list of assigned bots
  - Send messages through assigned bots
  - Send broadcast messages to multiple users

#### Message Logging
- All incoming and outgoing messages are logged
- Message status tracking (sent, delivered, failed)

### Reddit Integration

#### Authentication & Account Management
- OAuth 2.0 authentication with Reddit
- Secure token management and refresh
- Multiple account support per agent

#### Subreddit Management
- Search and discover subreddits
- Track subreddit metrics and engagement
- Validate subreddit rules before posting

#### Post Management
- Create text, link, image, and video posts
- Schedule posts for optimal timing
- Support for multiple subreddits
- Post validation against subreddit rules

#### Analytics & Engagement
- Track post performance metrics
  - Upvotes and downvotes
  - Comment counts
  - Engagement rates
- Historical analytics data
- Engagement trend analysis

#### Notifications
- Real-time notifications for:
  - Post comments
  - Upvotes and awards
  - Trending threads
  - AMAs in subscribed subreddits
- Mark notifications as read/unread

### API Endpoints

#### Admin APIs (Restricted Access)

1. **Add Bot**
   ```
   POST /api/admin/telegram/bots
   Body: { "bot_token": "your_bot_token" }
   Response: Bot details
   ```

2. **List All Bots**
   ```
   GET /api/admin/telegram/bots
   Response: Array of bots with assignment details
   ```

3. **Assign Bot**
   ```
   PUT /api/admin/telegram/bots/:id/assign
   Body: { "agent_id": 123 }
   Response: Assignment details
   ```

4. **Delete Bot**
   ```
   DELETE /api/admin/telegram/bots/:id
   Response: Success message
   ```

#### Agent APIs

1. **List Assigned Bots**
   ```
   GET /api/telegram/bots
   Response: Array of assigned bots
   ```

2. **Send Message**
   ```
   POST /api/telegram/messages
   Body: {
     "bot_id": 123,
     "chat_id": 456,
     "message": "Hello!"
   }
   Response: Message details
   ```

3. **Send Broadcast**
   ```
   POST /api/telegram/broadcast
   Body: {
     "bot_id": 123,
     "chat_ids": [456, 789],
     "message": "Broadcast message"
   }
   Response: Array of delivery results
   ```

#### Test Endpoints

1. **Test Bot Connection**
   ```
   GET /api/telegram/test-connection
   Response: Bot information and connection status
   ```

#### Reddit APIs

1. **Get Auth URL**
   ```
   GET /api/reddit/auth
   Response: { auth_url: "https://..." }
   ```

2. **Handle OAuth Callback**
   ```
   GET /api/reddit/callback?code=...
   Response: Account details
   ```

3. **Search Subreddits**
   ```
   GET /api/reddit/subreddits/search
   Query: 
     - query: Search term
     - account_id: Reddit account ID
   Response: Array of subreddits
   ```

4. **Create Post**
   ```
   POST /api/reddit/posts
   Body: {
     "account_id": 123,
     "subreddit": "cryptocurrency",
     "title": "Post title",
     "content": "Post content",
     "post_type": "text|link|image|video",
     "url": "https://...",
     "schedule_time": "2024-03-10T15:00:00Z"
   }
   Response: Post details
   ```

5. **Get Post Analytics**
   ```
   GET /api/reddit/posts/:post_id/analytics
   Response: Post analytics data
   ```

6. **Get Notifications**
   ```
   GET /api/reddit/accounts/:account_id/notifications
   Query:
     - unread_only: boolean
   Response: Array of notifications
   ```

7. **Mark Notifications as Read**
   ```
   POST /api/reddit/notifications/mark-read
   Body: {
     "notification_ids": [1, 2, 3]
   }
   Response: Success message
   ```

### Database Schema

#### Telegram Tables

1. **telegram_bots**
   - id (SERIAL PRIMARY KEY)
   - bot_token (TEXT UNIQUE)
   - bot_name (VARCHAR)
   - status (active/inactive/deleted)
   - created_at, updated_at

2. **telegram_bot_assignments**
   - id (SERIAL PRIMARY KEY)
   - bot_id (FOREIGN KEY)
   - agent_id (INTEGER)
   - status (active/inactive)
   - created_at, updated_at

3. **telegram_messages**
   - id (SERIAL PRIMARY KEY)
   - bot_id (FOREIGN KEY)
   - chat_id (BIGINT)
   - message (TEXT)
   - direction (incoming/outgoing)
   - message_id (BIGINT)
   - status (sent/delivered/failed)
   - created_at

#### Reddit Tables

1. **reddit_accounts**
   - id (SERIAL PRIMARY KEY)
   - agent_id (INTEGER)
   - username (VARCHAR)
   - refresh_token (TEXT)
   - access_token (TEXT)
   - token_expires_at (TIMESTAMP)
   - status (active/disconnected)
   - created_at, updated_at

2. **reddit_subreddits**
   - id (SERIAL PRIMARY KEY)
   - name (VARCHAR)
   - display_name (VARCHAR)
   - description (TEXT)
   - subscribers (INTEGER)
   - status (active/inactive/blocked)
   - created_at, updated_at
   - last_synced_at (TIMESTAMP)

3. **reddit_posts**
   - id (SERIAL PRIMARY KEY)
   - account_id (FOREIGN KEY)
   - subreddit_id (FOREIGN KEY)
   - reddit_post_id (VARCHAR)
   - title (VARCHAR)
   - content (TEXT)
   - url (TEXT)
   - post_type (text/link/image/video)
   - scheduled_for (TIMESTAMP)
   - posted_at (TIMESTAMP)
   - status (draft/scheduled/posted/failed/deleted)
   - created_at, updated_at

4. **reddit_post_analytics**
   - id (SERIAL PRIMARY KEY)
   - post_id (FOREIGN KEY)
   - upvotes (INTEGER)
   - downvotes (INTEGER)
   - comment_count (INTEGER)
   - score (INTEGER)
   - controversy_score (FLOAT)
   - recorded_at (TIMESTAMP)

5. **reddit_comments**
   - id (SERIAL PRIMARY KEY)
   - post_id (FOREIGN KEY)
   - reddit_comment_id (VARCHAR)
   - parent_comment_id (SELF REFERENCE)
   - content (TEXT)
   - author (VARCHAR)
   - upvotes, downvotes (INTEGER)
   - created_at, updated_at

6. **reddit_notifications**
   - id (SERIAL PRIMARY KEY)
   - account_id (FOREIGN KEY)
   - type (comment/upvote/trending/ama)
   - content (TEXT)
   - reference_id (TEXT)
   - read_at (TIMESTAMP)
   - created_at (TIMESTAMP)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   # Database Configuration
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=social_integration
   DB_PASSWORD=your_db_password
   DB_PORT=5432

   # Telegram Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token

   # Reddit Configuration
   REDDIT_CLIENT_ID=your_reddit_client_id
   REDDIT_CLIENT_SECRET=your_reddit_client_secret
   REDDIT_CALLBACK_URL=http://localhost:3000/api/reddit/callback
   REDDIT_USER_AGENT=web3_app:v1.0.0 (by /u/your_username)

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. Run database migrations:
   ```bash
   psql -U your_db_user -d social_integration -f schema.sql
   ```

4. Start the server:
   ```bash
   npm run dev    # Development mode
   npm start      # Production mode
   ```

## Security Features

- CORS protection with configurable origins
- Input validation using express-validator
- Authentication middleware (to be implemented)
- Admin role verification (to be implemented)
- Rate limiting (to be implemented)
- SQL injection protection through parameterized queries
- OAuth 2.0 authentication for Reddit
- Secure token management

## Error Handling

- Comprehensive error handling for all endpoints
- Detailed error messages in development
- Sanitized error responses in production
- Request validation errors
- Authentication errors
- Database errors
- Telegram API errors
- API rate limit errors

## Future Enhancements

1. Implement proper authentication system
2. Add rate limiting for API endpoints
3. Add webhook support for real-time updates
4. Implement message queueing for broadcasts
5. Add message templates feature
6. Implement user management system
7. Add analytics and reporting
8. Add support for media messages
9. Implement subreddit rule validation
10. Add support for Reddit polls
11. Implement comment moderation tools
12. Add support for Reddit awards
13. Implement content recommendation engine
14. Add support for Reddit live threads
15. Implement advanced analytics dashboard
16. Add support for Reddit chat

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
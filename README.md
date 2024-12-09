# Twitter and Telegram Integration API

A Node.js API service that provides integration with Twitter and Telegram platforms, allowing agents to manage social media accounts and bots.

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
   DB_NAME=twitter_integration
   DB_PASSWORD=your_db_password
   DB_PORT=5432

   # Telegram Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. Run database migrations:
   ```bash
   psql -U your_db_user -d twitter_integration -f schema.sql
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

## Error Handling

- Comprehensive error handling for all endpoints
- Detailed error messages in development
- Sanitized error responses in production
- Request validation errors
- Authentication errors
- Database errors
- Telegram API errors

## Future Enhancements

1. Implement proper authentication system
2. Add rate limiting for API endpoints
3. Add webhook support for real-time updates
4. Implement message queueing for broadcasts
5. Add message templates feature
6. Implement user management system
7. Add analytics and reporting
8. Add support for media messages

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
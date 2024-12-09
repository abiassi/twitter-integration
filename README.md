# Twitter Integration API

This API provides endpoints for integrating Twitter functionality into a Web3-based agent platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment variables:
```bash
cp .env.example .env
```
Then fill in your credentials in the `.env` file.

3. Set up the database:
```sql
CREATE TABLE twitter_accounts (
  id SERIAL PRIMARY KEY,
  agent_id INT NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  access_secret TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Twitter Authentication
- `GET /connect/twitter`: Generate OAuth URL for Twitter connection
- `GET /callback/twitter`: Handle Twitter OAuth callback

### Account Management
- `GET /accounts`: List connected Twitter accounts
- `DELETE /accounts/:id`: Disconnect a Twitter account

### Twitter Interactions
- `POST /twitter/tweet`: Post a new tweet
- `POST /twitter/like`: Like a tweet
- `POST /twitter/retweet`: Retweet a tweet
- `GET /twitter/timeline`: Fetch account timeline

## Testing

Run the test suite:
```bash
npm test
```

## Example Requests

### Post a Tweet
```bash
curl -X POST http://localhost:3000/twitter/tweet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"account_id": 1, "text": "Hello from the API!"}'
```

### Get Timeline
```bash
curl http://localhost:3000/twitter/timeline?account_id=1&count=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security

- All endpoints are protected with JWT authentication
- Sensitive tokens are encrypted before storage
- Rate limiting is enabled to prevent abuse
- Basic security headers are implemented
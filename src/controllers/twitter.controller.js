import { generateAuthLink, handleCallback } from '../config/twitter.js';
import * as db from '../config/database.js';
import CryptoJS from 'crypto-js';
import { validationResult } from 'express-validator';
import { TwitterApi } from 'twitter-api-v2';

// Store state to code verifier mapping
const stateToCodeVerifier = new Map();

class TwitterController {
  static async getAuthUrl(req, res) {
    try {
      console.log('Generating Twitter auth URL...');
      const { url, state, codeVerifier } = await generateAuthLink();
      
      // Store the code verifier mapped to state
      stateToCodeVerifier.set(state, codeVerifier);
      
      console.log('Auth URL generated successfully:', {
        url: url,
        state: state,
        codeVerifierLength: codeVerifier.length,
        hasCodeVerifier: Boolean(codeVerifier),
        mappingSize: stateToCodeVerifier.size
      });

      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        url,
        state,
        codeVerifier
      });
    } catch (error) {
      console.error('Twitter auth error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: error.message || 'Failed to generate auth URL',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async handleCallback(req, res) {
    const { code, state, error } = req.query;
    
    console.log('Received callback with params:', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasError: Boolean(error),
      mappingSize: stateToCodeVerifier.size,
      knownStates: Array.from(stateToCodeVerifier.keys())
    });

    try {
      // Check for Twitter OAuth errors
      if (error) {
        console.error('Twitter returned OAuth error:', error);
        throw new Error(`Twitter OAuth error: ${error}`);
      }

      if (!code) {
        console.error('Missing code in callback');
        throw new Error('Authorization code is missing');
      }

      if (!state) {
        console.error('Missing state in callback');
        throw new Error('State parameter is missing');
      }

      // Get code verifier from state mapping
      const codeVerifier = stateToCodeVerifier.get(state);
      console.log('Retrieved code verifier for state:', {
        state,
        hasCodeVerifier: Boolean(codeVerifier),
        codeVerifierLength: codeVerifier?.length
      });

      if (!codeVerifier) {
        console.error('No code verifier found for state:', state);
        throw new Error('Code verifier not found for this session');
      }

      console.log('Attempting to complete OAuth flow with:', {
        codeLength: code.length,
        verifierLength: codeVerifier.length,
        state: state,
        verifierSample: `${codeVerifier.substring(0, 10)}...${codeVerifier.substring(codeVerifier.length - 10)}`
      });

      // Complete the OAuth flow
      const { client, accessToken, refreshToken } = await handleCallback(code, codeVerifier);
      
      // Clean up the mapping
      stateToCodeVerifier.delete(state);
      
      console.log('OAuth flow completed successfully:', {
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
        accessTokenLength: accessToken?.length,
        remainingMappings: stateToCodeVerifier.size
      });

      try {
        // Get basic user info
        console.log('Fetching user info...');
        const me = await client.v2.me();
        console.log('User info fetched:', {
          userId: me.data.id,
          username: me.data.username
        });
        
        // Return JSON response instead of redirect for debugging
        if (req.query.format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          return res.json({
            access_token: accessToken,
            refresh_token: refreshToken || '',
            user_id: me.data.id,
            username: me.data.username
          });
        }

        // Redirect to frontend with success
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
        const params = new URLSearchParams({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          user_id: me.data.id,
          username: me.data.username
        });

        const redirectUrl = `${frontendURL}?${params.toString()}`;
        console.log('Redirecting to frontend:', {
          url: frontendURL,
          hasParams: params.toString().length > 0
        });

        res.redirect(redirectUrl);
      } catch (userError) {
        console.error('Error fetching user info:', userError);
        
        if (req.query.format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          return res.json({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
        }

        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
        const params = new URLSearchParams({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });
        
        console.log('Redirecting with tokens only due to user info error');
        res.redirect(`${frontendURL}?${params.toString()}`);
      }
    } catch (error) {
      console.error('Twitter callback error:', error);
      
      if (req.query.format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({
          error: error.message || 'Authentication failed',
          error_type: 'twitter_auth_error'
        });
      }

      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        error: error.message || 'Authentication failed',
        error_type: 'twitter_auth_error'
      });
      
      console.log('Redirecting with error:', error.message);
      res.redirect(`${frontendURL}?${params.toString()}`);
    }
  }

  static async getAccounts(req, res) {
    try {
      const { agent_id } = req.query;
      const query = agent_id 
        ? 'SELECT id, account_name, created_at FROM twitter_accounts WHERE agent_id = $1'
        : 'SELECT id, account_name, created_at FROM twitter_accounts';
      
      const params = agent_id ? [agent_id] : [];
      const { rows } = await db.query(query, params);
      
      res.setHeader('Content-Type', 'application/json');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }

  static async disconnectAccount(req, res) {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM twitter_accounts WHERE id = $1', [id]);
      res.setHeader('Content-Type', 'application/json');
      res.json({ message: 'Account disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting account:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to disconnect account' });
    }
  }

  static async postTweet(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { account_id, text } = req.body;
      const account = await this.getTwitterAccount(account_id);
      
      const userClient = new TwitterApi({
        accessToken: this.decryptToken(account.access_token),
        accessSecret: this.decryptToken(account.access_secret),
      });
      
      const tweet = await userClient.v2.tweet(text);
      res.setHeader('Content-Type', 'application/json');
      res.json(tweet);
    } catch (error) {
      console.error('Error posting tweet:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to post tweet' });
    }
  }

  static async likeTweet(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { account_id, tweet_id } = req.body;
      const account = await this.getTwitterAccount(account_id);
      
      const userClient = new TwitterApi({
        accessToken: this.decryptToken(account.access_token),
        accessSecret: this.decryptToken(account.access_secret),
      });
      
      await userClient.v2.like(tweet_id);
      res.setHeader('Content-Type', 'application/json');
      res.json({ message: 'Tweet liked successfully' });
    } catch (error) {
      console.error('Error liking tweet:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to like tweet' });
    }
  }

  static async retweet(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { account_id, tweet_id } = req.body;
      const account = await this.getTwitterAccount(account_id);
      
      const userClient = new TwitterApi({
        accessToken: this.decryptToken(account.access_token),
        accessSecret: this.decryptToken(account.access_secret),
      });
      
      await userClient.v2.retweet(tweet_id);
      res.setHeader('Content-Type', 'application/json');
      res.json({ message: 'Tweet retweeted successfully' });
    } catch (error) {
      console.error('Error retweeting:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to retweet' });
    }
  }

  static async getTimeline(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { account_id, count = 20 } = req.query;
      const account = await this.getTwitterAccount(account_id);
      
      const userClient = new TwitterApi({
        accessToken: this.decryptToken(account.access_token),
        accessSecret: this.decryptToken(account.access_secret),
      });
      
      const timeline = await userClient.v2.homeTimeline({ max_results: count });
      res.setHeader('Content-Type', 'application/json');
      res.json(timeline);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to fetch timeline' });
    }
  }

  static async getTimelinePosts(req, res) {
    try {
      const { maxResults = 5 } = req.query;
      
      // Create client with the access token
      const client = new TwitterApi(req.headers['twitter-access-token']);
      
      // Get timeline tweets
      const timeline = await client.v2.homeTimeline({
        max_results: maxResults,
        'tweet.fields': ['created_at', 'author_id', 'text']
      });
      
      res.setHeader('Content-Type', 'application/json');
      res.json({
        tweets: timeline.data.data || [],
        meta: timeline.data.meta
      });
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message || 'Failed to fetch timeline' });
    }
  }

  // Helper methods
  static async getTwitterAccount(id) {
    const { rows } = await db.query(
      'SELECT access_token, access_secret FROM twitter_accounts WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      throw new Error('Twitter account not found');
    }
    return rows[0];
  }

  static decryptToken(encryptedToken) {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, process.env.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

export default TwitterController;
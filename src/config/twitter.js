import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
  throw new Error('Twitter OAuth 2.0 credentials are missing in environment variables');
}

// Create OAuth 2.0 client
const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// Scopes for OAuth 2.0 - Using Twitter's recommended scopes
const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'follows.read',
  'follows.write'
].join(' ');

export const generateAuthLink = async () => {
  if (!process.env.TWITTER_CALLBACK_URL) {
    throw new Error('Twitter callback URL is not configured');
  }

  try {
    const { url, state, codeVerifier, codeChallenge } = await client.generateOAuth2AuthLink(
      process.env.TWITTER_CALLBACK_URL,
      {
        scope: SCOPES,
        code_challenge_method: 'S256',
        state: undefined // Let Twitter API generate the state
      }
    );

    console.log('Generated OAuth URL:', {
      url,
      state,
      codeVerifier,
      codeChallenge
    });

    return {
      url,
      state,
      codeVerifier
    };
  } catch (error) {
    console.error('Error generating auth link:', error);
    throw new Error(error.message || 'Failed to generate Twitter authorization URL');
  }
};

export const handleCallback = async (code, codeVerifier) => {
  try {
    const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.TWITTER_CALLBACK_URL,
    });

    return {
      client: loggedClient,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Twitter callback error:', error);
    throw new Error(error.message || 'Failed to complete Twitter authentication');
  }
};
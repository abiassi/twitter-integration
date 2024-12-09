import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import twitterRoutes from './routes/twitter.js';
import telegramRoutes from './routes/telegram.routes.js';
import redditRoutes from './routes/reddit.routes.js';
import { authenticateToken } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Debug logging for requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// CORS configuration
const allowedOrigins = [
  'https://sunny-elf-e576bd.netlify.app',
  'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3-m5wu7rep--5173--fc837ba8.local-credentialless.webcontainer-api.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://4802-2001-8a0-6a58-800-e532-a227-f37f-8192.ngrok-free.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Twitter-Access-Token'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Routes
console.log('Mounting routes...');
app.use('/api/twitter', twitterRoutes);
app.use('/api', telegramRoutes);
app.use('/api', redditRoutes);
console.log('Routes mounted');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthcheck = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: new Date().toISOString()
    };

    // Add environment info
    healthcheck.environment = {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Add service info
    healthcheck.services = {
      twitter: {
        configured: Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
        callbackUrl: process.env.TWITTER_CALLBACK_URL
      },
      telegram: {
        configured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
      },
      reddit: {
        configured: Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
        callbackUrl: process.env.REDDIT_CALLBACK_URL
      }
    };

    res.status(200).json(healthcheck);
  } catch (error) {
    res.status(503).json({
      message: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Set JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  // Handle specific error types
  if (err.type === 'auth') {
    return res.status(401).json({
      error: err.message || 'Authentication failed',
      error_type: 'auth_error'
    });
  }
  
  if (err.type === 'validation') {
    return res.status(400).json({
      error: err.message || 'Validation failed',
      error_type: 'validation_error',
      details: err.details
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    error_type: 'server_error',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
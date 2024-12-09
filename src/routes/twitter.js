import express from 'express';
import { body, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import TwitterController from '../controllers/twitter.controller.js';

const router = express.Router();

// Twitter Authentication (no auth required for these endpoints)
router.get('/connect/twitter', TwitterController.getAuthUrl);
router.get('/callback/twitter', TwitterController.handleCallback);

// Timeline (auth required)
router.get('/timeline', 
  authenticateToken,
  query('maxResults').optional().isInt({ min: 1, max: 100 }),
  TwitterController.getTimelinePosts
);

// Account Management (auth required)
router.get('/accounts', 
  authenticateToken,
  query('agent_id').optional().isInt(),
  TwitterController.getAccounts
);

router.delete('/accounts/:id',
  authenticateToken,
  TwitterController.disconnectAccount
);

// Twitter Interactions (auth required)
router.post('/tweet',
  authenticateToken,
  [
    body('account_id').isInt(),
    body('text').isString().notEmpty().isLength({ max: 280 })
  ],
  TwitterController.postTweet
);

router.post('/like',
  authenticateToken,
  [
    body('account_id').isInt(),
    body('tweet_id').isString().notEmpty()
  ],
  TwitterController.likeTweet
);

router.post('/retweet',
  authenticateToken,
  [
    body('account_id').isInt(),
    body('tweet_id').isString().notEmpty()
  ],
  TwitterController.retweet
);

export default router;
import express from 'express';
import { body, param, query } from 'express-validator';
import {
    getAuthUrl,
    handleCallback,
    searchSubreddits,
    createPost,
    getPostAnalytics,
    getNotifications,
    markNotificationsRead
} from '../controllers/reddit.controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { isAuthenticated } from '../middleware/is-authenticated.js';

const router = express.Router();

// Authentication routes
router.get('/reddit/auth', isAuthenticated, getAuthUrl);
router.get('/reddit/callback', isAuthenticated, handleCallback);

// Subreddit routes
router.get(
    '/reddit/subreddits/search',
    isAuthenticated,
    [
        query('query')
            .notEmpty()
            .withMessage('Search query is required')
            .isString()
            .withMessage('Search query must be a string'),
        query('account_id')
            .notEmpty()
            .withMessage('Account ID is required')
            .isInt()
            .withMessage('Account ID must be an integer')
    ],
    validateRequest,
    searchSubreddits
);

// Post routes
router.post(
    '/reddit/posts',
    isAuthenticated,
    [
        body('account_id')
            .notEmpty()
            .withMessage('Account ID is required')
            .isInt()
            .withMessage('Account ID must be an integer'),
        body('subreddit')
            .notEmpty()
            .withMessage('Subreddit is required')
            .isString()
            .withMessage('Subreddit must be a string'),
        body('title')
            .notEmpty()
            .withMessage('Title is required')
            .isString()
            .withMessage('Title must be a string')
            .isLength({ max: 300 })
            .withMessage('Title must be less than 300 characters'),
        body('post_type')
            .notEmpty()
            .withMessage('Post type is required')
            .isIn(['text', 'link', 'image', 'video'])
            .withMessage('Invalid post type'),
        body('content')
            .optional()
            .isString()
            .withMessage('Content must be a string'),
        body('url')
            .optional()
            .isURL()
            .withMessage('URL must be valid'),
        body('schedule_time')
            .optional()
            .isISO8601()
            .withMessage('Schedule time must be a valid ISO 8601 date')
    ],
    validateRequest,
    createPost
);

// Analytics routes
router.get(
    '/reddit/posts/:post_id/analytics',
    isAuthenticated,
    [
        param('post_id')
            .isInt()
            .withMessage('Post ID must be an integer')
    ],
    validateRequest,
    getPostAnalytics
);

// Notification routes
router.get(
    '/reddit/accounts/:account_id/notifications',
    isAuthenticated,
    [
        param('account_id')
            .isInt()
            .withMessage('Account ID must be an integer'),
        query('unread_only')
            .optional()
            .isBoolean()
            .withMessage('unread_only must be a boolean')
    ],
    validateRequest,
    getNotifications
);

router.post(
    '/reddit/notifications/mark-read',
    isAuthenticated,
    [
        body('notification_ids')
            .isArray()
            .withMessage('notification_ids must be an array')
            .notEmpty()
            .withMessage('notification_ids cannot be empty'),
        body('notification_ids.*')
            .isInt()
            .withMessage('Each notification ID must be an integer')
    ],
    validateRequest,
    markNotificationsRead
);

export default router; 
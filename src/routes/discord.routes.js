import express from 'express';
import { body, param, query } from 'express-validator';
import {
    getAuthUrl,
    handleCallback,
    listServers,
    createChannel,
    assignRole,
    sendNotification,
    createEvent
} from '../controllers/discord.controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { isAuthenticated } from '../middleware/is-authenticated.js';
import { isAdmin } from '../middleware/is-admin.js';

const router = express.Router();

// Authentication routes
router.get('/discord/auth', isAuthenticated, getAuthUrl);
router.get('/discord/callback', isAuthenticated, handleCallback);

// Server management routes
router.get(
    '/discord/accounts/:account_id/servers',
    isAuthenticated,
    [
        param('account_id')
            .isInt()
            .withMessage('Account ID must be an integer')
    ],
    validateRequest,
    listServers
);

// Channel management routes
router.post(
    '/discord/channels',
    isAuthenticated,
    isAdmin,
    [
        body('server_id')
            .isInt()
            .withMessage('Server ID must be an integer'),
        body('name')
            .notEmpty()
            .withMessage('Channel name is required')
            .isString()
            .withMessage('Channel name must be a string')
            .matches(/^[a-z0-9-]+$/)
            .withMessage('Channel name can only contain lowercase letters, numbers, and hyphens'),
        body('type')
            .notEmpty()
            .withMessage('Channel type is required')
            .isIn(['text', 'voice', 'category', 'announcement'])
            .withMessage('Invalid channel type')
    ],
    validateRequest,
    createChannel
);

// Role management routes
router.post(
    '/discord/roles/assign',
    isAuthenticated,
    isAdmin,
    [
        body('server_id')
            .isInt()
            .withMessage('Server ID must be an integer'),
        body('user_id')
            .notEmpty()
            .withMessage('User ID is required')
            .isString()
            .withMessage('User ID must be a string'),
        body('role_name')
            .notEmpty()
            .withMessage('Role name is required')
            .isString()
            .withMessage('Role name must be a string')
    ],
    validateRequest,
    assignRole
);

// Notification routes
router.post(
    '/discord/notifications',
    isAuthenticated,
    [
        body('channel_id')
            .isInt()
            .withMessage('Channel ID must be an integer'),
        body('content')
            .notEmpty()
            .withMessage('Content is required')
            .isString()
            .withMessage('Content must be a string'),
        body('type')
            .notEmpty()
            .withMessage('Notification type is required')
            .isIn(['transaction', 'nft_mint', 'governance', 'event', 'announcement'])
            .withMessage('Invalid notification type'),
        body('metadata')
            .optional()
            .isObject()
            .withMessage('Metadata must be an object'),
        body('schedule_time')
            .optional()
            .isISO8601()
            .withMessage('Schedule time must be a valid ISO 8601 date')
    ],
    validateRequest,
    sendNotification
);

// Event routes
router.post(
    '/discord/events',
    isAuthenticated,
    [
        body('server_id')
            .isInt()
            .withMessage('Server ID must be an integer'),
        body('name')
            .notEmpty()
            .withMessage('Event name is required')
            .isString()
            .withMessage('Event name must be a string'),
        body('description')
            .optional()
            .isString()
            .withMessage('Description must be a string'),
        body('start_time')
            .notEmpty()
            .withMessage('Start time is required')
            .isISO8601()
            .withMessage('Start time must be a valid ISO 8601 date'),
        body('end_time')
            .optional()
            .isISO8601()
            .withMessage('End time must be a valid ISO 8601 date'),
        body('channel_id')
            .optional()
            .isInt()
            .withMessage('Channel ID must be an integer')
    ],
    validateRequest,
    createEvent
);

export default router; 
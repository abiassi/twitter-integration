import express from 'express';
import { body, param } from 'express-validator';
import {
    addBot,
    listBots,
    assignBot,
    deleteBot,
    listAgentBots,
    sendMessage,
    broadcast,
    testBotConnection
} from '../controllers/telegram.controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { isAdmin } from '../middleware/is-admin.js';
import { isAuthenticated } from '../middleware/is-authenticated.js';

const router = express.Router();

// Test route - no auth required for testing
router.get('/telegram/test-connection', testBotConnection);

// Admin routes
router.post(
    '/admin/telegram/bots',
    isAuthenticated,
    isAdmin,
    [
        body('bot_token')
            .notEmpty()
            .withMessage('Bot token is required')
            .isString()
            .withMessage('Bot token must be a string')
    ],
    validateRequest,
    addBot
);

router.get(
    '/admin/telegram/bots',
    isAuthenticated,
    isAdmin,
    listBots
);

router.put(
    '/admin/telegram/bots/:id/assign',
    isAuthenticated,
    isAdmin,
    [
        param('id')
            .isInt()
            .withMessage('Bot ID must be an integer'),
        body('agent_id')
            .isInt()
            .withMessage('Agent ID must be an integer')
    ],
    validateRequest,
    assignBot
);

router.delete(
    '/admin/telegram/bots/:id',
    isAuthenticated,
    isAdmin,
    [
        param('id')
            .isInt()
            .withMessage('Bot ID must be an integer')
    ],
    validateRequest,
    deleteBot
);

// Agent routes
router.get(
    '/telegram/bots',
    isAuthenticated,
    listAgentBots
);

router.post(
    '/telegram/messages',
    isAuthenticated,
    [
        body('bot_id')
            .isInt()
            .withMessage('Bot ID must be an integer'),
        body('chat_id')
            .isInt()
            .withMessage('Chat ID must be an integer'),
        body('message')
            .notEmpty()
            .withMessage('Message is required')
            .isString()
            .withMessage('Message must be a string')
    ],
    validateRequest,
    sendMessage
);

router.post(
    '/telegram/broadcast',
    isAuthenticated,
    [
        body('bot_id')
            .isInt()
            .withMessage('Bot ID must be an integer'),
        body('chat_ids')
            .isArray()
            .withMessage('Chat IDs must be an array')
            .notEmpty()
            .withMessage('Chat IDs array cannot be empty'),
        body('chat_ids.*')
            .isInt()
            .withMessage('Each Chat ID must be an integer'),
        body('message')
            .notEmpty()
            .withMessage('Message is required')
            .isString()
            .withMessage('Message must be a string')
    ],
    validateRequest,
    broadcast
);

export default router; 
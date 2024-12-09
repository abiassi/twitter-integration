import express from 'express';
import twitterRoutes from './twitter.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Twitter routes
router.use('/', twitterRoutes);

export default router;
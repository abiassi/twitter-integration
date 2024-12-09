import express from 'express';
import rateLimit from 'express-rate-limit';

export function setupMiddleware(app) {
  // Parse JSON bodies
  app.use(express.json());
  
  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);

  // Add basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}
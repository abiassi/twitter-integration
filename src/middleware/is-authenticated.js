export const isAuthenticated = (req, res, next) => {
    // For testing purposes, we'll skip authentication
    // In production, you should implement proper JWT verification
    req.user = { id: 1 }; // Mock user for testing
    next();
}; 
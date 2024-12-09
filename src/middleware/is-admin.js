export const isAdmin = (req, res, next) => {
    // For testing purposes, we'll skip admin check
    // In production, you should implement proper admin role verification
    next();
}; 
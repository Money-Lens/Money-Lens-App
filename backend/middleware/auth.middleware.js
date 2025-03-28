const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("Decoded Token:", decoded);  // Debugging

      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      req.user = { _id: decoded.userId };
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = auth;

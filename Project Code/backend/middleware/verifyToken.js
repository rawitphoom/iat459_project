// This checks if a user has a valid token before letting them access protected routes.

const jwt = require("jsonwebtoken");

module.exports = function verifyToken(req, res, next) {
  //1. Get token from Authorization header
  // Accept either "Bearer <token>" or raw token in Authorization header.
  const header = req.headers.authorization;

  //2. If no token, return 401
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  //3. Verify token, if invalid return 403. If valid, attach user info to req and call next()
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch (e) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Admin authorization middleware.
// This runs AFTER verifyToken — the user is already authenticated.
// It checks whether the authenticated user has the "admin" role.
//
// 401 = "I don't know who you are" (no token / bad token — handled by verifyToken)
// 403 = "I know who you are, but you don't have permission" (not an admin)

module.exports = function verifyAdmin(req, res, next) {
  // req.user is set by verifyToken middleware (contains decoded JWT payload)
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  // User is an admin — allow the request to continue
  next();
};

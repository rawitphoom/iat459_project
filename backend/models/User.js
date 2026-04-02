const mongoose = require("mongoose");

// Basic auth user schema. Password is stored as a bcrypt hash.
// The "role" field enables Role-Based Access Control (RBAC).
// Default is "user" — admins must be created intentionally (e.g. via DB or seed script).
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

// Export the model for use in auth routes.
module.exports = mongoose.model("User", UserSchema);

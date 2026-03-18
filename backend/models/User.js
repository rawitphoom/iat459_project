const mongoose = require("mongoose");

// Basic auth user schema. Password is stored as a bcrypt hash.
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Export the model for use in auth routes.
module.exports = mongoose.model("User", UserSchema);

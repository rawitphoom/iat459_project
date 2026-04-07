const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "All fields are required" });

    // Check if email is already in use
    const emailTaken = await User.findOne({ email });
    if (emailTaken) return res.status(400).json({ error: "Email already in use" });

    //1. Check if username is taken
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already taken" });

    //2. Hash password and create user
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    //3. Save user to DB
    const newUser = await User.create({ username, email, password: hashed });
    res.status(201).json({ message: "User created", id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/forgot-password
// Generates a reset token for the user (looked up by email or username)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({
      $or: [{ email }, { username: email }],
    });
    if (!user) return res.status(404).json({ error: "No account found with that email/username" });

    // Generate a random reset token and set 15-min expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    // In a real app we'd email this link — for this project we return the token directly
    res.json({ message: "Reset token generated", resetToken });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/reset-password
// Resets the password using the token from forgot-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Token and new password required" });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    //1. Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    //2. Compare password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    //3. generate token (The "Wristband")
    // The JWT payload carries id, username, and role so the frontend
    // and backend middleware can check permissions without querying the DB again.
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
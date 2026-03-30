const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,128}$/;

function signToken(user) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: String(user._id), email: user.email }, JWT_SECRET, {
    expiresIn: "1h"
  });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword, name } = req.body || {};

    if (!email || !password || !confirmPassword || !name) {
      return res.status(400).json({ message: "Name, email, password and confirm password are required" });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password);
    const normalizedConfirm = String(confirmPassword);

    if (trimmedName.length < 2 || trimmedName.length > 60) {
      return res.status(400).json({ message: "Name must be between 2 and 60 characters" });
    }

    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (normalizedPassword !== normalizedConfirm) {
      return res.status(400).json({ message: "Password and confirm password do not match" });
    }

    if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return res.status(400).json({
        message: "Password must be 10-128 chars and include uppercase, lowercase, number and symbol"
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const user = new User({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword
    });
    await user.save();

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: signToken(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to register user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: signToken(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to login" });
  }
});

module.exports = router;
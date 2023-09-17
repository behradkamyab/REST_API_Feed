const User = require("../models/user.js");

const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const jwt_secret = process.env.JWT_SECRET;

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed!");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      const error = new Error("email is already existed!");
      error.statusCode = 422;
      throw error;
    }
    const hashedPass = await bcrypt.hash(password, 12);
    if (!hashedPass) {
      const error = new Error("Cannot save password!");
      error.statusCode = 422;
      throw error;
    }
    const user = new User({
      email: email,
      password: hashedPass,
      name: name,
    });
    if (!user) {
      const error = new Error("Cannot created new user!");
      error.statusCode = 500;
      throw error;
    }
    const result = await user.save();
    if (!result) {
      const error = new Error("user creation failed!");
      error.statusCode = 500;
      throw error;
    }
    res.status(201).json({
      success: true,
      userId: result._id,
      message: "User created successfully!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("this email is not in the database");
      error.statusCode = 401;
      throw error;
    }
    const doMatch = await bcrypt.compare(password, user.password);
    if (!doMatch) {
      const error = new Error("password is not correct");
      error.statusCode = 422;
      throw error;
    }
    const token = jwt.sign(
      { email: user.email, userId: user._id.toString() },
      jwt_secret,
      { expiresIn: "1h" }
    );
    res.status(200).json({ token: token, userId: user._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

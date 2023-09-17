const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth-controller");

const router = express.Router();

router.put(
  "/signup",
  [
    // body("email").isEmail("Please enter a valid email!"),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);

router.post("/login", authController.login);

module.exports = router;

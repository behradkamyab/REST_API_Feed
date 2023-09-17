const jwt = require("jsonwebtoken");
require("dotenv").config();
 const jwt_secret = process.env.JWT_SECRET

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      const error = new Error("Not authenticated");
      error.statusCode = 401;
      throw error;
    }
    const token = authHeader.split(" ")[1];
    let decodedtoken;
    decodedtoken = jwt.verify(token, jwt_secret);
    if (!decodedtoken) {
      const error = new Error("Not authenticated");
      error.statusCode = 401;
      throw error;
    }
    req.userId = decodedtoken.userId;
    next();
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

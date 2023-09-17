const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const compression = require("compression");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const helmet = require("helmet");
require("dotenv").config();

const port = process.env.PORT;
const db_uri = process.env.DB_URI;

const feedRoutes = require("./routes/feed-routes");
const authRoutes = require("./routes/auth-routes");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + file.originalname);
  },
});

app.use(compression());
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(bodyParser.json());
app.use(multer({ storage: fileStorage }).single("image"));
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(authRoutes);
app.use(feedRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ success: false, message: message, data: data });
});

const startServer = async () => {
  try {
    const result = await mongoose.connect(db_uri);
    if (result) {
      const server = app.listen(port);
      const io = require("./socket").init(server);
      io.on("connection", (socket) => {
        console.log("Client connected");
      });
    }
  } catch (err) {
    throw new Error("Cannot connect to the database");
  }
};
startServer();

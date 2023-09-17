const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try {
    totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    if (!posts) {
      const error = new Error("Cannot find the posts");
      error.statusCode = 404;
      next(error);
    }
    res
      .status(200)
      .json({ success: true, posts: posts, totalItems: totalItems });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed!");
      error.statusCode = 422;
      throw error;
    }
    if (!req.file) {
      const error = new Error("No image provided.");
      error.statusCode = 422;
      throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file.path.replace("\\", "/");

    let creator;
    const post = new Post({
      title: title,
      imageUrl: imageUrl,
      content: content,
      creator: req.userId,
    });
    const result = await post.save();
    if (result) {
      const user = await User.findById(req.userId);
      user.posts.push(result);
      lastResult = await user.save();
      if (lastResult) {
        creator = lastResult;
        io.getIO().emit("posts", {
          action: "create",
          post: {
            ...result_doc,
            creator: { _id: req.userId, name: user.name },
          },
        });
        res.status(200).json({
          success: true,
          post: result,
          creator: { name: creator.name },
        });
      }
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      const error = new Error("Cannot find the post");
      error.statucCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed!");
      error.statusCode = 422;
      throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path.replace("\\", "/");
    }
    if (!imageUrl) {
      const error = new Error("You have to select a picture!");
      error.statusCode = 422;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("Cannot find the post!");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not Authorized!");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;

    const result = await post.save();
    if (!result) {
      const error = new Error("Cannot update the post!");
      throw error;
    }
    io.getIO().emit("posts", { action: "update", post: result });
    res.status(200).json({
      success: true,
      messag: "post updated successfully!",
      post: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      const error = new Error("Cannot find the post!");
      error.statusCode = 404;
      throw error;
    }
    clearImage(post.imageUrl);
    const result = await Post.findByIdAndDelete(postId);
    if (!result) {
      const error = new Error("Cannot delete the post");
      error.statusCode = 500;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (user) {
      user.posts.pull(postId);
      const lastResult = await user.save();
      if (lastResult) {
        io.getIO().emit("posts", { action: "delete", post: postId });
        res.status(200).json({
          success: true,
          message: "the post is deleted successfully!",
        });
      }
    }
  } catch (err) {
    if (!err.statucCode) {
      err.statucCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Cannot find the user!");
      error.statusCode = 404;
      throw error;
    }
    const status = user.status;
    res.status(200).json({
      success: true,
      message: "Status fetched successfully",
      status: status,
    });
  } catch (err) {
    if (!err.statucCode) {
      err.statucCode = 500;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  const newStatus = req.body.status;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Cannot find the user!");
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    const result = await user.save();
    if (result) {
      res
        .status(200)
        .json({ success: true, message: "status updated successfully" });
    }
  } catch (err) {
    if (!err.statucCode) {
      err.statucCode = 500;
    }
    next(err);
  }
};

const clearImage = async (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  console.log(filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

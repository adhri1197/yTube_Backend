import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleLike = async (userId, targetId, targetType) => {
  if (!isValidObjectId(targetId)) {
    throw new ApiError(400, "Invalid ID provided.");
  }

  const like = await Like.findOne({ user: userId, target: targetId, type: targetType });

  if (like) {
    // If like exists, remove it
    await like.remove();
    return { liked: false };
  } else {
    // Otherwise, create a new like
    await Like.create({ user: userId, target: targetId, type: targetType });
    return { liked: true };
  }
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user.id;

  // Toggle like on video
  const result = await toggleLike(userId, videoId, "video");
  res.json(new ApiResponse(200, result));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  // Toggle like on comment
  const result = await toggleLike(userId, commentId, "comment");
  res.json(new ApiResponse(200, result));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user.id;

  // Toggle like on tweet
  const result = await toggleLike(userId, tweetId, "tweet");
  res.json(new ApiResponse(200, result));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all liked videos
  const likes = await Like.find({ user: userId, type: "video" }).populate("target");

  const videos = likes.map((like) => like.target);
  res.json(new ApiResponse(200, { videos }));
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};

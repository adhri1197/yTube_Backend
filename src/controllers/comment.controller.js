import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const comments = await Comment.find({ videoId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const totalComments = await Comment.countDocuments({ videoId });

    res.status(200).json(
        new ApiResponse({
            data: comments,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalComments,
            },
        })
    );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (!text || text.trim() === "") {
        throw new ApiError(400, "Comment text is required");
    }

    const newComment = await Comment.create({
        videoId,
        text,
        user: req.user._id, // Assuming `req.user` contains authenticated user's data
    });

    res.status(201).json(new ApiResponse({ data: newComment }));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    if (!text || text.trim() === "") {
        throw new ApiError(400, "Comment text is required");
    }

    const updatedComment = await Comment.findOneAndUpdate(
        { _id: commentId, user: req.user._id }, // Ensuring only the owner can update the comment
        { text },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found or unauthorized");
    }

    res.status(200).json(new ApiResponse({ data: updatedComment }));
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        user: req.user._id, // Ensuring only the owner can delete the comment
    });

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found or unauthorized");
    }

    res.status(200).json(new ApiResponse({ message: "Comment deleted successfully" }));
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
};

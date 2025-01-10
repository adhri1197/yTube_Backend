import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

    const filter = {};
    if (query) {
        filter.title = { $regex: query, $options: 'i' };
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user ID");
        }
        filter.userId = userId;
    }

    const sortOptions = { [sortBy]: sortType === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const videos = await Video.find(filter).sort(sortOptions).skip(skip).limit(parseInt(limit));
    const totalVideos = await Video.countDocuments(filter);

    res.json(new ApiResponse(200, "Videos fetched successfully", {
        videos,
        page: parseInt(page),
        totalPages: Math.ceil(totalVideos / limit),
        totalVideos
    }));
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!req.file) {
        throw new ApiError(400, "Video file is required");
    }

    if (!title) {
        throw new ApiError(400, "Title is required");
    }

    const uploadResult = await uploadOnCloudinary(req.file.path, "video");

    const newVideo = await Video.create({
        title,
        description,
        userId: req.user._id, // Assuming user authentication middleware
        videoUrl: uploadResult.secure_url,
        thumbnailUrl: uploadResult.thumbnail_url,
        createdAt: new Date()
    });

    res.status(201).json(new ApiResponse(201, "Video published successfully", newVideo));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId).populate('userId', 'name email');

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    res.json(new ApiResponse(200, "Video fetched successfully", video));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (req.file) {
        const uploadResult = await uploadOnCloudinary(req.file.path, "video");
        updateFields.thumbnailUrl = uploadResult.thumbnail_url;
    }

    const video = await Video.findOneAndUpdate(
        { _id: videoId, userId: req.user._id }, // Ensure only the owner can update
        updateFields,
        { new: true }
    );

    if (!video) {
        throw new ApiError(404, "Video not found or unauthorized");
    }

    res.json(new ApiResponse(200, "Video updated successfully", video));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findOneAndDelete({ _id: videoId, userId: req.user._id });

    if (!video) {
        throw new ApiError(404, "Video not found or unauthorized");
    }

    res.json(new ApiResponse(200, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findOne({ _id: videoId, userId: req.user._id });

    if (!video) {
        throw new ApiError(404, "Video not found or unauthorized");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    res.json(new ApiResponse(200, "Publish status toggled successfully", video));
});

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};

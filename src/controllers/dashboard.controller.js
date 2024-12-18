import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const totalVideos = await Video.countDocuments({ userId: channelId });
    const totalViews = await Video.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(channelId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);

    const totalSubscribers = await Subscription.countDocuments({ channelId });
    const totalLikes = await Like.countDocuments({ channelId });

    res.json(new ApiResponse(200, "Channel stats fetched successfully", {
        totalVideos,
        totalViews: totalViews[0]?.totalViews || 0,
        totalSubscribers,
        totalLikes
    }));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const skip = (page - 1) * limit;

    const videos = await Video.find({ userId: channelId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const totalVideos = await Video.countDocuments({ userId: channelId });

    res.json(new ApiResponse(200, "Channel videos fetched successfully", {
        videos,
        page: parseInt(page),
        totalPages: Math.ceil(totalVideos / limit),
        totalVideos
    }));
});

export {
    getChannelStats,
    getChannelVideos
};

import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user._id; // Assuming authenticated user ID is available in req.user

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const existingSubscription = await Subscription.findOne({ subscriberId: userId, channelId });

    if (existingSubscription) {
        await existingSubscription.remove();
        return res.json(new ApiResponse(200, "Unsubscribed successfully"));
    }

    await Subscription.create({ subscriberId: userId, channelId });
    res.json(new ApiResponse(200, "Subscribed successfully"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription.find({ channelId }).populate('subscriberId', 'name email');

    res.json(new ApiResponse(200, "Subscribers fetched successfully", subscribers));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const subscriptions = await Subscription.find({ subscriberId }).populate('channelId', 'name description');

    res.json(new ApiResponse(200, "Subscribed channels fetched successfully", subscriptions));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};

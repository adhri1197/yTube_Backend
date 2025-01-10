import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file
router.use(verifyJWT);

router
    .route("/")
    // Route to get all videos with optional query parameters
    .get(getAllVideos)
    // Route to publish a new video with file uploads
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    // Route to get video details by ID
    .get(getVideoById)
    // Route to delete a video by ID
    .delete(deleteVideo)
    // Route to update a video's details, allowing thumbnail upload
    .patch(upload.single("thumbnail"), updateVideo);

// Route to toggle the publish status of a video
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;

import { Router } from 'express';
import {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments,
} from '../controllers/comment.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use( verifyJWt );

router.route("/:videoId").get(getVideoComments).post(addComment); // Get comments for a video and add a new comment
router.route("/:commentId").patch(updateComment).delete(deleteComment); // Update and delete a comment

export default router;
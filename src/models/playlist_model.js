import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema({
    name:{
        type: String,
        required: true
    },

    desscription:{
        type: String,
        required: True
    },

    videos: [{
        type: Schema.Types.ObjectId,
        ref: "video"
    }],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"

    }

},{timestamps: true})

export const Playlist = mongoose.model("Playlist", playlistSchema)
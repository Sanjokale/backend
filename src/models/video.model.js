import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudanary url
      required: true,
    },
    thumbnail: {
      type: String, // cloudanary url
      required: true,
    },
    title: {
      type: String, 
      required: true,
    },
    description: {
      type: String, 
      required: true,
    },
    duration: {
      type: Number, 
      required: true,
    },
    views: {
      type: Number, 
      default: 0,
    },
    isPublished: {
      type: Boolean, 
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId, 
      ref: "User",   //here we are refering the user model we might use aggriagation pipeline to get the user details or we can use populate method or nested populate method
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);  //from this we can write aggrigation queries. This is also called aggrigation pipeline.

export const Video = mongoose.model("Video", videoSchema);

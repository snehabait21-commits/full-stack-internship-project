import mongoose from "mongoose";
const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    commentedon: { type: Date, default: Date.now },

    language: { type: String, default: "en" },

    showLocation: { type: Boolean, default: false },
    location: { type: String, default: "" },

    likes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    ],
    dislikes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    ],

    status: {
      type: String,
      enum: ["active", "flagged", "removed"],
      default: "active",
    },

    reportedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        reason: { type: String },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
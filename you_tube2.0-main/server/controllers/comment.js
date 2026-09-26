import comment from "../Modals/comment.js";
import mongoose from "mongoose";

// ---------- Task 6: Moderation helpers ----------

const badWords = [
  "idiot",
  "stupid",
  "dumb",
  "hate",
  "kill",
  "abuse",
];

const containsAbusiveWords = (text) => {
  const lowerText = text.toLowerCase();
  return badWords.some((word) => lowerText.includes(word));
};

const hasRepeatedSpecialChars = (text) => {
  const pattern = /([^a-zA-Z0-9\s])\1{3,}/;
  return pattern.test(text);
};

const isSpam = async (userid, videoid, commentbody) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentDuplicate = await comment.findOne({
    userid,
    videoid,
    commentbody,
    commentedon: { $gte: oneMinuteAgo },
  });
  return !!recentDuplicate;
};

// ---------- Existing functions (unchanged) ----------

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  const { commentbody, userid, videoid } = commentdata;

  try {
    if (containsAbusiveWords(commentbody)) {
      return res.status(400).json({ message: "Comment contains abusive language and cannot be posted" });
    }
    if (hasRepeatedSpecialChars(commentbody)) {
      return res.status(400).json({ message: "Comment contains too many repeated special characters" });
    }
    if (await isSpam(userid, videoid, commentbody)) {
      return res.status(400).json({ message: "Duplicate comment detected. Please wait before posting the same comment again" });
    }

    const postcomment = new comment(commentdata);
    await postcomment.save();
    return res.status(200).json({ comment: true, data: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({
      videoid: videoid,
      status: { $ne: "removed" },
    });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ---------- Task 6: New functions ----------

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const targetcomment = await comment.findById(_id);
    if (!targetcomment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const alreadyLiked = targetcomment.likes.includes(userid);
    const alreadyDisliked = targetcomment.dislikes.includes(userid);

    if (alreadyLiked) {
      targetcomment.likes.pull(userid);
    } else {
      targetcomment.likes.push(userid);
      if (alreadyDisliked) {
        targetcomment.dislikes.pull(userid);
      }
    }

    await targetcomment.save();
    return res.status(200).json({
      likes: targetcomment.likes.length,
      dislikes: targetcomment.dislikes.length,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const targetcomment = await comment.findById(_id);
    if (!targetcomment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const alreadyDisliked = targetcomment.dislikes.includes(userid);
    const alreadyLiked = targetcomment.likes.includes(userid);

    if (alreadyDisliked) {
      targetcomment.dislikes.pull(userid);
    } else {
      targetcomment.dislikes.push(userid);
      if (alreadyLiked) {
        targetcomment.likes.pull(userid);
      }
    }

    await targetcomment.save();
    return res.status(200).json({
      likes: targetcomment.likes.length,
      dislikes: targetcomment.dislikes.length,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reportcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid, reason } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const targetcomment = await comment.findById(_id);
    if (!targetcomment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const alreadyReported = targetcomment.reportedBy.some(
      (r) => r.user.toString() === userid
    );
    if (alreadyReported) {
      return res.status(400).json({ message: "You have already reported this comment" });
    }

    targetcomment.reportedBy.push({ user: userid, reason });

    if (targetcomment.reportedBy.length >= 3) {
      targetcomment.status = "flagged";
    }

    await targetcomment.save();
    return res.status(200).json({
      message: "Comment reported successfully",
      status: targetcomment.status,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
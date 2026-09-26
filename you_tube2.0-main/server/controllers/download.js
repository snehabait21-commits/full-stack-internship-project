import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

// Task 2: daily download limits per plan
const DOWNLOAD_LIMITS = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: 10,
};

export const requestDownload = async (req, res) => {
  const { userid, videoid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(videoid)) {
    return res.status(400).json({ message: "Invalid request" });
  }

  try {
    const user = await users.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const videoData = await video.findById(videoid);
    if (!videoData) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Task 2: count how many downloads this user has made today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysDownloadCount = await download.countDocuments({
      userid,
      downloadedon: { $gte: startOfDay, $lte: endOfDay },
    });

    const limit = DOWNLOAD_LIMITS[user.plan] || DOWNLOAD_LIMITS.free;

    if (todaysDownloadCount >= limit) {
      return res.status(403).json({
        message:
          user.plan === "free"
            ? "Free plan allows 1 download per day. Upgrade to premium for more downloads."
            : "You've reached your daily download limit. Please try again tomorrow.",
        limitReached: true,
      });
    }

    // Task 2: record the download
    const newDownload = await download.create({
      userid,
      videoid,
      videotitle: videoData.videotitle,
      userplan: user.plan,
    });

    return res.status(200).json({
      download: true,
      data: newDownload,
      filepath: videoData.filepath,
      remainingToday: limit - todaysDownloadCount - 1,
    });
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Task 2: get a user's download history for their profile "Downloads" section
export const getDownloadHistory = async (req, res) => {
  const { userid } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userid)) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    const downloads = await download
      .find({ userid })
      .sort({ downloadedon: -1 })
      .populate("videoid");
    return res.status(200).json(downloads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
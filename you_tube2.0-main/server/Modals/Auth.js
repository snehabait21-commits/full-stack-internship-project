import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },

  theme: { type: String, enum: ["light", "dark"], default: "dark" },

  lastLoginCity: { type: String, default: "" },
  lastLoginState: { type: String, default: "" },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpVerified: { type: Boolean, default: true },

  // Task 3: updated plan tiers (Free/Bronze/Silver/Gold)
  plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },
  planExpiresAt: { type: Date, default: null },
});

export default mongoose.model("user", userschema);
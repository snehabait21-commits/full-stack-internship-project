import mongoose from "mongoose";
import nodemailer from "nodemailer";
import users from "../Modals/Auth.js";

const getThemeByISTTime = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const istHour = istTime.getUTCHours();

  if (istHour >= 10 && istHour < 12) {
    return "light";
  }
  return "dark";
};

// Task 5: get city/state based on the caller's internet connection
const getLocationFromIP = async () => {
  try {
    const response = await fetch("http://ip-api.com/json/");
    const data = await response.json();
    if (data.status === "success") {
      return { city: data.city || "", state: data.regionName || "" };
    }
    return { city: "", state: "" };
  } catch (error) {
    console.error("Geolocation lookup failed:", error);
    return { city: "", state: "" };
  }
};

// Task 5: send OTP email - transporter created here (not at module load time)
// so it always picks up the already-loaded .env values
const sendOtpEmail = async (toEmail, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Your YourTube login verification code",
    text: `We noticed a login from a new location or device. Your verification code is: ${otp}. This code expires in 10 minutes. If this wasn't you, please secure your account.`,
  });
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const login = async (req, res) => {
  const { email, name, image } = req.body;
  const loginTheme = getThemeByISTTime();
  const { city, state } = await getLocationFromIP();

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      // first-ever login - no OTP needed, just record their location
      const newUser = await users.create({
        email,
        name,
        image,
        theme: loginTheme,
        lastLoginCity: city,
        lastLoginState: state,
        otpVerified: true,
      });
      return res.status(201).json({ result: newUser, otpRequired: false });
    }

    existingUser.theme = loginTheme;

    // Task 5: check if this is a new city/state compared to last login
    const isNewLocation =
      (city && city !== existingUser.lastLoginCity) ||
      (state && state !== existingUser.lastLoginState);

    if (isNewLocation) {
      const otp = generateOtp();
      existingUser.otp = otp;
      existingUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      existingUser.otpVerified = false;
      await existingUser.save();

      await sendOtpEmail(existingUser.email, otp);

      return res.status(200).json({
        result: existingUser,
        otpRequired: true,
        message: "New login location detected. Please verify the OTP sent to your email.",
      });
    }

    await existingUser.save();
    return res.status(200).json({ result: existingUser, otpRequired: false });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Task 5: verify the OTP the user enters
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please try logging in again." });
    }

    // OTP correct - update their known location and clear the OTP
    const { city, state } = await getLocationFromIP();
    user.lastLoginCity = city;
    user.lastLoginState = state;
    user.otp = null;
    user.otpExpiresAt = null;
    user.otpVerified = true;
    await user.save();

    return res.status(200).json({ result: user, message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatetheme = async (req, res) => {
  const { id: _id } = req.params;
  const { theme } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: { theme: theme } },
      { new: true }
    );
    return res.status(200).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
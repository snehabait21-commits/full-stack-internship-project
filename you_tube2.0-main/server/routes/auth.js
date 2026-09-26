import express from "express";
import { login, updateprofile, updatetheme, verifyOtp } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.patch("/updatetheme/:id", updatetheme);
routes.post("/verify-otp", verifyOtp);
export default routes;
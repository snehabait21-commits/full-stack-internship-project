import express from "express";
import { createOrder, verifyPayment, getPlanPricing } from "../controllers/payment.js";

const routes = express.Router();

routes.post("/create-order", createOrder);
routes.post("/verify", verifyPayment);
routes.get("/pricing", getPlanPricing);

export default routes;
import express from "express";
import { requestDownload, getDownloadHistory } from "../controllers/download.js";

const routes = express.Router();

routes.post("/request", requestDownload);
routes.get("/history/:userid", getDownloadHistory);

export default routes;
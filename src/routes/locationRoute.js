import express from "express";
import { locationController } from "../controllers/locationController.js";

const router = express.Router()

router.get('/locations',locationController)

export default router;
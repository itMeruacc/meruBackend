import express from "express";
import {
  createActivity,
  createScreenShot,
  splitActivity,
  updateActivity,
  deleteScreenshot,
  deleteActivity,
  updateLastActive,
  getActivities,
} from "../controllers/activity.js";
import { authPass } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/splitActivity").post(authPass, splitActivity);

router
  .route("/")
  .post(authPass, createActivity)
  .delete(authPass, deleteActivity);

router.route("/getActivities").post(authPass, getActivities);

router
  .route("/screenshot")
  .post(authPass, createScreenShot)
  .delete(authPass, deleteScreenshot);

router.route("/lastActive").post(authPass, updateLastActive);
router.route("/:id").patch(authPass, updateActivity);

export default router;

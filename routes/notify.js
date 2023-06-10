import express from "express";
import { authPass } from "../middleware/authMiddleware.js";
import {
  sendNotification,
  readNotification,
  deleteNotification,
  getNotifications,
} from "../controllers/notification.js";

const router = express.Router();

router
  .route("/")
  .get(authPass, getNotifications)
  .post(authPass, sendNotification);
router
  .route("/:id")
  .patch(authPass, readNotification)
  .delete(authPass, deleteNotification);

export default router;

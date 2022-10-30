import express from "express";
import { getAllTeams } from "../controllers/admin.js";
import {
  getAllEmployee,
  adminCommondata,
  changeCurrency,
  updateConfig,
} from "../controllers/admin.js";

import { authPass } from "../middleware/authMiddleware.js";
import restrictTo from "../middleware/restrictTo.js";
const router = express.Router();

router.use(authPass);
router.use(restrictTo("admin"));

router.route("/getAllEmployee").post(getAllEmployee);
router.route("/getAllTeams").post(getAllTeams);
router.route("/getCommonData").post(adminCommondata);
router.route("/currency").post(changeCurrency);
router.route("/config").patch(updateConfig);

export default router;

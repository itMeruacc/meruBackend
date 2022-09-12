import express from "express";
import { authPass } from "../middleware/authMiddleware.js";
import {
  createProject,
  getProjects,
  getProjectsByClients,
  deleteProjectById,
  editProjectById,
  getProjectById,
  addMember,
  removeMember,
  // assignProjectLeader,
  // removeProjectLeader,
} from "../controllers/project.js";

const router = express.Router();

// create and get all
router.route("/").post(authPass, createProject).get(authPass, getProjects);

// get projects group by clients(including null)
router.route("/byClients").get(authPass, getProjectsByClients);

// get, del and edit by id
router
  .route("/:id")
  .get(authPass, getProjectById)
  .delete(authPass, deleteProjectById);
router.route("/addMember/:id/:editType").patch(authPass, editProjectById);

// edit members by id
router.route("/addMember/:id").post(authPass, addMember);

router.route("/removeMember/:id").patch(authPass, removeMember);

export default router;

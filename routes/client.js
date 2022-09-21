import express from "express";
import { authPass } from "../middleware/authMiddleware.js";
import {
  createClient,
  getClientById,
  deleteClientById,
  editClientById,
  getClients,
  getClientTimeById,
} from "../controllers/client.js";

const router = express.Router();

router.route("/").post(authPass, createClient).get(authPass, getClients);

// get time
router.route("/getTime/:id").get(authPass, getClientTimeById);

router
  .route("/:id")
  .get(authPass, getClientById)
  .delete(authPass, deleteClientById)
  .patch(authPass, editClientById);

export default router;

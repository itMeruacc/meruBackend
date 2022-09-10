import express from "express";
import { authPass } from "../middleware/authMiddleware.js";
import {
  createClient,
  getClientById,
  deleteClientById,
  editClientById,
  getClients,
} from "../controllers/client.js";

const router = express.Router();

router.route("/").post(authPass, createClient).get(authPass, getClients);

router
  .route("/:id")
  .get(authPass, getClientById)
  .delete(authPass, deleteClientById)
  .patch(authPass, editClientById);

export default router;

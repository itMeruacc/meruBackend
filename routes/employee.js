import express from "express";
import { authPass } from "../middleware/authMiddleware.js";
import { managerPass } from "../middleware/roleMiddleware.js";
import {
  getEmployeeById,
  deleteEmployee,
  editEmployee,
  getEmployeeList,
  getEmployeeDetails,
  getDashboardData,
  getAllEmployees,
  editManagerFor,
} from "../controllers/employee.js";

const router = express.Router();

// get dashboard data
router.route("/dashboard/all").get(authPass, getDashboardData);

// get all employees
router.route("/all").get(authPass, getAllEmployees);

// employee by id
router.route("/:id").get(getEmployeeById).delete(managerPass, deleteEmployee);

// router.route("/allEmployees").post(authPass, getAllEmployee);

router.route("/employeeList").get(authPass, getEmployeeList);

router
  .route("/:id")
  .get(authPass, getEmployeeById)
  .delete(authPass, deleteEmployee);
router.route("/employeeInfo/:id").post(getEmployeeDetails);
router.route("/edit/:id").patch(authPass, editEmployee);

// edit manager for
router.route("/manager/:id").patch(authPass, editManagerFor);

export default router;

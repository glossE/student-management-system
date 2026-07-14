import { Router } from "express";
import { uploadPhoto } from "../middleware/upload.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticate } from "../middleware/auth.js";
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/students.controller.js";

export const studentsRouter = Router();

// Every student route requires a logged-in user. Both PRINCIPAL and ADMIN are
// allowed all student CRUD, so authentication alone is the gate here; role-
// specific gates (authorize) are used on the user-management routes instead.
studentsRouter.use(authenticate);

studentsRouter.get("/", asyncHandler(listStudents));
studentsRouter.get("/:id", asyncHandler(getStudent));
studentsRouter.post("/", uploadPhoto, asyncHandler(createStudent));
studentsRouter.put("/:id", uploadPhoto, asyncHandler(updateStudent));
studentsRouter.delete("/:id", asyncHandler(deleteStudent));

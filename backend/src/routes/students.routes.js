import { Router } from "express";
import { uploadPhoto } from "../middleware/upload.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/students.controller.js";

export const studentsRouter = Router();

studentsRouter.get("/", asyncHandler(listStudents));
studentsRouter.get("/:id", asyncHandler(getStudent));
studentsRouter.post("/", uploadPhoto, asyncHandler(createStudent));
studentsRouter.put("/:id", uploadPhoto, asyncHandler(updateStudent));
studentsRouter.delete("/:id", asyncHandler(deleteStudent));

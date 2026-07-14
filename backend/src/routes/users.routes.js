import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { listUsers, createUser, setUserActive } from "../controllers/users.controller.js";

export const usersRouter = Router();

// Only the PRINCIPAL may manage staff accounts: logged in AND role === PRINCIPAL.
usersRouter.use(authenticate, authorize("PRINCIPAL"));

usersRouter.get("/", asyncHandler(listUsers));
usersRouter.post("/", asyncHandler(createUser));
usersRouter.patch("/:id/active", asyncHandler(setUserActive));

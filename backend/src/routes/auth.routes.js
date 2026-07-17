import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticate } from "../middleware/auth.js";
import { login, googleLogin, logout, me } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.post("/google", asyncHandler(googleLogin)); // Google Identity Services ID token
authRouter.post("/logout", authenticate, asyncHandler(logout)); // must be logged in to log out
authRouter.get("/me", authenticate, asyncHandler(me));          // who am I?

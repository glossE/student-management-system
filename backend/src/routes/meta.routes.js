import { Router } from "express";
import { COURSES, GENDERS, YEARS } from "../validation/student.schema.js";
import { isCloudinaryConfigured } from "../lib/cloudinary.js";
import { isGoogleConfigured } from "../lib/google.js";

export const metaRouter = Router();

metaRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Feeds the frontend dropdowns from a single source of truth shared with the
// zod validators, so the client and server can never drift out of sync.
metaRouter.get("/meta", (_req, res) => {
  res.json({
    courses: COURSES,
    genders: GENDERS,
    years: YEARS,
    photoUploadEnabled: isCloudinaryConfigured(),
    googleAuthEnabled: isGoogleConfigured(),
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
  });
});

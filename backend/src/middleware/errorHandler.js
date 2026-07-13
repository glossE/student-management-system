import { Prisma } from "@prisma/client";
import multer from "multer";

export class HttpError extends Error {
  constructor(status, message, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Express 4 does not forward rejected promises from async handlers, so every
// async route is wrapped to funnel errors into the error middleware below.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(_req, res) {
  res.status(404).json({ message: "Route not found" });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity (4 args)
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
      ...(err.fieldErrors ? { errors: err.fieldErrors } : {}),
    });
  }

  if (err instanceof multer.MulterError || err.message?.includes("images are allowed")) {
    return res.status(400).json({ message: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ message: "A record with this value already exists" });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}

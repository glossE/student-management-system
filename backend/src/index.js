import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { studentsRouter } from "./routes/students.routes.js";
import { metaRouter } from "./routes/meta.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.use("/api", metaRouter);
app.use("/api/students", studentsRouter);

// Serve the compiled Angular bundle that the build step copied into public/.
app.use(express.static(PUBLIC_DIR));

// SPA fallback: any non-API GET that did not match a static asset returns
// index.html so Angular's client-side router can take over. This must be
// registered AFTER the API routes and static middleware, otherwise it would
// swallow real API requests and hashed asset files.
app.get(/^(?!\/api).*/, (_req, res, next) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err) => {
    if (err) next();
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

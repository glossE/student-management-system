# Student Management System

A full-stack Student Management System built as a single deployable web service.
The Express backend serves both the REST API (`/api/*`) and the compiled Angular
single-page app, so there is one service to deploy and no CORS to configure.

**Live URL:** _<add your Render URL here after deploying>_

> ⏱️ The live app is hosted on Render's free tier. The first request after a
> period of inactivity can take **~1 minute** while the service cold-starts.
> Subsequent requests are fast.

---

## Tech stack

| Layer      | Technology                                                             |
| ---------- | ---------------------------------------------------------------------- |
| Frontend   | Angular 19 (standalone components, Reactive Forms) + PrimeNG 19 (Aura) |
| Backend    | Node.js + Express                                                      |
| Database   | PostgreSQL via Prisma ORM                                              |
| Validation | Zod (server) + Angular validators (client)                            |
| Photos     | Cloudinary (streamed uploads, no local disk storage)                  |
| Hosting    | Render — single web service + managed Postgres                        |

---

## Features

- **CRUD** for students: create, read, edit, delete.
- **Auto-generated admission number** in the format `PU-2026-XXXX`, backed by a
  PostgreSQL `SEQUENCE` and a `UNIQUE` constraint (race-condition safe).
- **Photo upload** streamed straight to Cloudinary — only the secure URL is
  persisted (Render's disk is ephemeral, so files are never written locally).
- **Server-side pagination, sorting, search and filtering**, driven by the
  PrimeNG `p-table` lazy-load events hitting the API.
- **Search** by name / email / admission number; **filter** by course, year and gender.
- **Two-sided validation** — Angular Reactive Form validators plus Zod on Express,
  with field-level error messages surfaced in the form.
- **Activity logging** — every create / update / delete is recorded in an
  `activity_logs` table.
- **Indexes** on `name` and `admission_number`.
- **Responsive UI** using a PrimeNG Aura theme preset, `p-dialog`, `p-fileUpload`,
  `p-select`, `p-datepicker`, `p-confirmDialog`, `p-toast` and `p-avatar`.

---

## Screenshots

Add screenshots to `docs/screenshots/` and they will render below:

| Student list                              | Add / edit dialog                          |
| ----------------------------------------- | ------------------------------------------ |
| ![List](docs/screenshots/list.png)        | ![Dialog](docs/screenshots/dialog.png)     |

---

## Architecture

```
Pillai_Uni_Task/
├── backend/                 Express API + Prisma + serves the built SPA
│   ├── prisma/
│   │   ├── schema.prisma     Student + ActivityLog models, indexes
│   │   ├── migrations/       Init migration (tables, enums, admission SEQUENCE)
│   │   └── seed.js           Sample students
│   ├── src/
│   │   ├── index.js          App entry: API routes, static SPA, SPA fallback
│   │   ├── controllers/      Request handlers (CRUD)
│   │   ├── routes/           Route definitions
│   │   ├── services/         Admission number + activity log helpers
│   │   ├── middleware/       Multer upload + error handling
│   │   ├── validation/       Zod schema (shared source of truth for dropdowns)
│   │   └── lib/              Prisma + Cloudinary clients
│   └── public/               Angular build output (generated at build time)
├── frontend/                Angular 19 + PrimeNG app
│   └── src/app/
│       ├── components/       student-list (table) + student-form (dialog)
│       ├── services/         HTTP service
│       └── models/           Typed interfaces
├── scripts/copy-dist.js     Copies the Angular build into backend/public
├── render.yaml              Render blueprint (web service + Postgres)
└── package.json             Root scripts orchestrating build + start
```

**Single-service model:** the production build compiles Angular into
`frontend/dist`, copies it into `backend/public`, and Express serves it as static
files. Any non-`/api` route falls back to `index.html` so Angular's router can
handle deep links.

### Why a database sequence for the admission number?

Generating the number by counting existing rows (`count + 1`) is not safe: two
concurrent requests can read the same count and produce a duplicate. Instead,
each insert pulls the next value from a dedicated Postgres `SEQUENCE`
(`nextval('student_admission_seq')`), which is atomic, and the `admission_number`
column carries a `UNIQUE` constraint as a final guarantee.

---

## Local development

### Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database (local or hosted)
- A Cloudinary account (optional — photo upload is disabled if not configured)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd Pillai_Uni_Task
cp .env.example backend/.env   # then edit backend/.env with your values
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate deploy   # apply the schema + admission sequence
npm run seed                # optional: insert 5 sample students
cd ..
```

### 4. Run in development

Run the API and the Angular dev server in two terminals:

```bash
npm run dev:backend    # Express on http://localhost:3000
npm run dev:frontend   # Angular dev server on http://localhost:4200
```

During development the Angular dev server proxies API calls to the backend — see
`frontend/proxy.conf.json`.

### 5. Or run the production build locally

```bash
npm run build   # builds Angular, copies into backend/public, generates Prisma client
npm start       # runs migrate deploy, then serves everything on PORT (default 3000)
```

Open <http://localhost:3000>.

---

## Environment variables

Commit `.env.example`, never the real `.env`.

| Variable         | Required | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | yes      | PostgreSQL connection string. On Render use the **internal** URL.  |
| `CLOUDINARY_URL` | no       | `cloudinary://key:secret@cloud`. Photo upload is off when unset.   |
| `PORT`           | no       | Port Express listens on. Render injects this automatically.        |

---

## API documentation

Base path: `/api`

### Health

`GET /api/health` → `200`

```json
{ "status": "ok", "uptime": 12.34, "timestamp": "2026-07-13T06:27:15.782Z" }
```

### Dropdown metadata

`GET /api/meta` → `200` — the allowed courses / genders / years (shared with the
server validators) plus whether photo upload is enabled.

### List students

`GET /api/students`

| Query param | Type   | Description                                          |
| ----------- | ------ | ---------------------------------------------------- |
| `page`      | number | Page number (default `1`)                            |
| `limit`     | number | Page size (default `10`, max `100`)                  |
| `search`    | string | Matches name, email or admission number (partial)    |
| `course`    | string | Exact course filter                                  |
| `year`      | number | Exact year filter (1–4)                              |
| `gender`    | string | `MALE` / `FEMALE` / `OTHER`                          |
| `sortField` | string | `name`, `admissionNumber`, `course`, `year`, `email`, `createdAt` |
| `sortOrder` | string | `asc` / `desc` (default `desc`)                      |

Response `200`:

```json
{
  "data": [ { "id": 1, "admissionNumber": "PU-2026-0001", "name": "Aarav Sharma", "...": "..." } ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Get one

`GET /api/students/:id` → `200` student, or `404`.

### Create

`POST /api/students` — `multipart/form-data`

Fields: `name`, `course`, `year`, `dob` (`YYYY-MM-DD`), `email`, `mobile`,
`gender`, `address`, and optional `photo` (image file). The admission number is
assigned by the server. Response `201` with the created student.

### Update

`PUT /api/students/:id` — `multipart/form-data`, same fields (all optional). A new
`photo` replaces the previous Cloudinary asset. Response `200`.

### Delete

`DELETE /api/students/:id` → `204`. Also removes the Cloudinary photo.

### Validation errors

Invalid input returns `422` with field-level messages:

```json
{
  "message": "Validation failed",
  "errors": {
    "email": "Enter a valid email address",
    "mobile": "Mobile must be exactly 10 digits"
  }
}
```

---

## Deployment to Render

This repo includes a `render.yaml` blueprint that provisions a free Postgres
database and a web service. Using the Render dashboard:

1. **New → Blueprint**, connect this repository. Render reads `render.yaml` and
   creates `student-management-db` (Postgres) and the `student-management` web
   service.
2. `DATABASE_URL` is wired automatically from the database (internal connection
   string).
3. Add `CLOUDINARY_URL` as an environment variable on the web service (marked
   `sync: false`, so you set it in the dashboard).
4. Deploy. The build runs `npm run build`; the start command runs
   `npm start`, which executes `prisma migrate deploy` before starting Express.
5. Health checks hit `GET /api/health`.

To create the service manually instead of via the blueprint:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- Set `DATABASE_URL` (internal Postgres URL) and `CLOUDINARY_URL`.

---

## Root npm scripts

| Script                | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `npm run install:all` | Install backend and frontend dependencies                   |
| `npm run build`       | Build Angular → copy into `backend/public` → generate Prisma |
| `npm start`           | `prisma migrate deploy` then start Express                   |
| `npm run dev:backend` | Run the API with file watching                              |
| `npm run dev:frontend`| Run the Angular dev server                                  |
| `npm run seed`        | Seed sample students                                        |

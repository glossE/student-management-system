import { prisma } from "../lib/prisma.js";
import { uploadPhoto, deletePhoto } from "../lib/cloudinary.js";
import { nextAdmissionNumber } from "../services/admissionNumber.js";
import { logActivity } from "../services/activityLog.js";
import {
  studentSchema,
  studentUpdateSchema,
  formatZodError,
} from "../validation/student.schema.js";
import { HttpError } from "../middleware/errorHandler.js";

const SORTABLE_FIELDS = new Set([
  "name",
  "admissionNumber",
  "course",
  "year",
  "email",
  "createdAt",
]);

function buildListQuery(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));

  const where = {};
  if (query.search) {
    const search = String(query.search).trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { admissionNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (query.course) where.course = String(query.course);
  if (query.gender) where.gender = String(query.gender);
  if (query.year) {
    const year = Number.parseInt(query.year, 10);
    if (!Number.isNaN(year)) where.year = year;
  }

  const sortField = SORTABLE_FIELDS.has(query.sortField) ? query.sortField : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return { page, limit, where, orderBy: { [sortField]: sortOrder } };
}

export async function listStudents(req, res) {
  const { page, limit, where, orderBy } = buildListQuery(req.query);

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  res.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function getStudent(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new HttpError(404, "Student not found");
  res.json(student);
}

export async function createStudent(req, res) {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(422, "Validation failed", formatZodError(parsed.error));
  }

  let photo = null;
  if (req.file) photo = await uploadPhoto(req.file.buffer);

  try {
    const student = await prisma.$transaction(async (tx) => {
      const admissionNumber = await nextAdmissionNumber(tx);
      const created = await tx.student.create({
        data: {
          ...parsed.data,
          admissionNumber,
          photoUrl: photo?.secure_url ?? null,
          photoPublicId: photo?.public_id ?? null,
        },
      });
      await logActivity(tx, {
        action: "CREATE",
        entityId: created.id,
        details: { admissionNumber: created.admissionNumber, name: created.name },
        actor: req.user,
      });
      return created;
    });

    res.status(201).json(student);
  } catch (err) {
    // The DB write failed after the image was already stored, so remove the
    // now-orphaned Cloudinary asset before surfacing the error.
    if (photo) await deletePhoto(photo.public_id).catch(() => {});
    throw err;
  }
}

export async function updateStudent(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Student not found");

  const parsed = studentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(422, "Validation failed", formatZodError(parsed.error));
  }

  let photo = null;
  if (req.file) photo = await uploadPhoto(req.file.buffer);

  try {
    const student = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(photo
            ? { photoUrl: photo.secure_url, photoPublicId: photo.public_id }
            : {}),
        },
      });
      await logActivity(tx, {
        action: "UPDATE",
        entityId: id,
        details: { fields: Object.keys(parsed.data) },
        actor: req.user,
      });
      return updated;
    });

    // Replacing the photo succeeded, so the previous asset can be dropped.
    if (photo && existing.photoPublicId) {
      await deletePhoto(existing.photoPublicId).catch(() => {});
    }
    res.json(student);
  } catch (err) {
    if (photo) await deletePhoto(photo.public_id).catch(() => {});
    throw err;
  }
}

export async function deleteStudent(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Student not found");

  await prisma.$transaction(async (tx) => {
    await tx.student.delete({ where: { id } });
    await logActivity(tx, {
      action: "DELETE",
      entityId: id,
      details: { admissionNumber: existing.admissionNumber, name: existing.name },
      actor: req.user,
    });
  });

  if (existing.photoPublicId) await deletePhoto(existing.photoPublicId).catch(() => {});

  res.status(204).send();
}

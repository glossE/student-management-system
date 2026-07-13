import { z } from "zod";

export const COURSES = [
  "B.Sc Computer Science",
  "B.Sc Information Technology",
  "B.Com",
  "B.A English",
  "B.E Mechanical",
  "B.E Civil",
  "BBA",
  "BCA",
];

export const GENDERS = ["MALE", "FEMALE", "OTHER"];
export const YEARS = [1, 2, 3, 4];

const nameRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
const mobileRegex = /^[0-9]{10}$/;

export const studentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(nameRegex, "Name may only contain letters, spaces and . ' -"),
  course: z.enum(COURSES, { errorMap: () => ({ message: "Select a valid course" }) }),
  year: z.coerce
    .number({ invalid_type_error: "Year is required" })
    .int()
    .refine((v) => YEARS.includes(v), "Year must be between 1 and 4"),
  dob: z.coerce
    .date({ invalid_type_error: "Date of birth is required" })
    .refine((d) => d < new Date(), "Date of birth must be in the past"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  mobile: z.string().trim().regex(mobileRegex, "Mobile must be exactly 10 digits"),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: "Select a gender" }) }),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(300, "Address must be at most 300 characters"),
});

// Every field is optional on update, but any field provided must still be valid.
export const studentUpdateSchema = studentSchema.partial();

export function formatZodError(error) {
  const fieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

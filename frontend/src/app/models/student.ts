export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Student {
  id: number;
  admissionNumber: string;
  name: string;
  course: string;
  year: number;
  dob: string;
  email: string;
  mobile: string;
  gender: Gender;
  address: string;
  photoUrl: string | null;
  photoPublicId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentQuery {
  page: number;
  limit: number;
  search?: string;
  course?: string | null;
  year?: number | null;
  gender?: string | null;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentMeta {
  courses: string[];
  genders: Gender[];
  years: number[];
  photoUploadEnabled: boolean;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
}

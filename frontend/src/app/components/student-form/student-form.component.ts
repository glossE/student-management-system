import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { AvatarModule } from 'primeng/avatar';

import { StudentService } from '../../services/student.service';
import { ApiError, Student, StudentMeta } from '../../models/student';

interface Option<T> {
  label: string;
  value: T;
}

const YEAR_SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };
const GENDER_LABELS: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const MOBILE_PATTERN = /^[0-9]{10}$/;

function pastDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return new Date(control.value) < new Date() ? null : { pastDate: true };
}

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    FileUploadModule,
    AvatarModule,
  ],
  templateUrl: './student-form.component.html',
  styleUrl: './student-form.component.scss',
})
export class StudentFormComponent implements OnChanges, OnInit {
  @Input() visible = false;
  @Input() student: Student | null = null;
  @Input() meta: StudentMeta | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<Student>();

  private fb = inject(FormBuilder);
  private studentService = inject(StudentService);
  private messages = inject(MessageService);

  readonly today = new Date();

  courseOptions: Option<string>[] = [];
  yearOptions: Option<number>[] = [];
  genderOptions: Option<string>[] = [];

  photoFile: File | null = null;
  photoPreview: string | null = null;
  submitting = false;

  private serverErrors: Record<string, string> = {};

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(NAME_PATTERN)]],
    course: [null as string | null, Validators.required],
    year: [null as number | null, Validators.required],
    dob: [null as Date | null, [Validators.required, pastDateValidator]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
    gender: [null as string | null, Validators.required],
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
  });

  ngOnInit(): void {
    // Clear a server-side error for a field as soon as the user edits it.
    Object.keys(this.form.controls).forEach((name) => {
      this.form.get(name)!.valueChanges.subscribe(() => delete this.serverErrors[name]);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meta'] && this.meta) this.buildOptions(this.meta);
    if (changes['visible'] && this.visible) this.resetForm();
  }

  get isEdit(): boolean {
    return this.student != null;
  }

  get photoUploadEnabled(): boolean {
    return this.meta?.photoUploadEnabled ?? false;
  }

  private buildOptions(meta: StudentMeta): void {
    this.courseOptions = meta.courses.map((c) => ({ label: c, value: c }));
    this.yearOptions = meta.years.map((y) => ({ label: `${y}${YEAR_SUFFIX[y] ?? 'th'} Year`, value: y }));
    this.genderOptions = meta.genders.map((g) => ({ label: GENDER_LABELS[g] ?? g, value: g }));
  }

  private resetForm(): void {
    this.serverErrors = {};
    this.photoFile = null;
    this.submitting = false;

    if (this.student) {
      this.form.reset({
        name: this.student.name,
        course: this.student.course,
        year: this.student.year,
        dob: new Date(this.student.dob),
        email: this.student.email,
        mobile: this.student.mobile,
        gender: this.student.gender,
        address: this.student.address,
      });
      this.photoPreview = this.student.photoUrl;
    } else {
      this.form.reset({ name: '', course: null, year: null, dob: null, email: '', mobile: '', gender: null, address: '' });
      this.photoPreview = null;
    }
  }

  onPhotoSelect(event: { files?: File[]; currentFiles?: File[] }): void {
    const file = event.files?.[0] ?? event.currentFiles?.[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.photoPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview = this.student?.photoUrl ?? null;
  }

  error(name: string): string | null {
    if (this.serverErrors[name]) return this.serverErrors[name];
    const control = this.form.get(name);
    if (!control || !(control.touched || control.dirty) || !control.errors) return null;
    const e = control.errors;
    if (e['required']) return 'This field is required';
    if (e['minlength']) return `Must be at least ${e['minlength'].requiredLength} characters`;
    if (e['maxlength']) return `Must be at most ${e['maxlength'].requiredLength} characters`;
    if (e['email']) return 'Enter a valid email address';
    if (e['pastDate']) return 'Date of birth must be in the past';
    if (e['pattern']) return name === 'mobile' ? 'Mobile must be exactly 10 digits' : "Only letters, spaces and . ' - are allowed";
    return 'Invalid value';
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildFormData();
    this.submitting = true;

    const request$ = this.isEdit
      ? this.studentService.update(this.student!.id, payload)
      : this.studentService.create(payload);

    request$.subscribe({
      next: (student) => {
        this.submitting = false;
        this.saved.emit(student);
        this.close();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.handleError(err);
      },
    });
  }

  private buildFormData(): FormData {
    const v = this.form.getRawValue();
    const fd = new FormData();
    fd.append('name', (v.name ?? '').trim());
    fd.append('course', v.course ?? '');
    fd.append('year', String(v.year));
    fd.append('dob', this.toDateString(v.dob!));
    fd.append('email', (v.email ?? '').trim());
    fd.append('mobile', (v.mobile ?? '').trim());
    fd.append('gender', v.gender ?? '');
    fd.append('address', (v.address ?? '').trim());
    if (this.photoFile) fd.append('photo', this.photoFile);
    return fd;
  }

  private handleError(err: HttpErrorResponse): void {
    const body = err.error as ApiError | undefined;
    if (err.status === 422 && body?.errors) {
      this.serverErrors = { ...body.errors };
      return;
    }
    this.messages.add({
      severity: 'error',
      summary: 'Could not save student',
      detail: body?.message ?? 'An unexpected error occurred. Please try again.',
    });
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

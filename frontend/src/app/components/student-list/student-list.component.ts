import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { StudentFormComponent } from '../student-form/student-form.component';
import { StudentService } from '../../services/student.service';
import { Student, StudentMeta } from '../../models/student';

const GENDER_LABELS: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const GENDER_SEVERITY: Record<string, 'info' | 'success' | 'secondary'> = {
  MALE: 'info',
  FEMALE: 'success',
  OTHER: 'secondary',
};

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    IconFieldModule,
    InputIconModule,
    AvatarModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    StudentFormComponent,
  ],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.scss',
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private confirm = inject(ConfirmationService);
  private messages = inject(MessageService);

  students: Student[] = [];
  total = 0;
  loading = false;

  rows = 10;
  first = 0;
  private sortField = 'createdAt';
  private sortOrder: 'asc' | 'desc' = 'desc';

  search = '';
  filterCourse: string | null = null;
  filterYear: number | null = null;
  filterGender: string | null = null;

  meta: StudentMeta | null = null;
  courseOptions: { label: string; value: string }[] = [];
  yearOptions: { label: string; value: number }[] = [];
  genderOptions: { label: string; value: string }[] = [];

  dialogVisible = false;
  selected: Student | null = null;

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search = value.trim();
      this.applyFilters();
    });

    this.studentService.meta().subscribe((meta) => {
      this.meta = meta;
      this.courseOptions = meta.courses.map((c) => ({ label: c, value: c }));
      this.yearOptions = meta.years.map((y) => ({ label: `${y}`, value: y }));
      this.genderOptions = meta.genders.map((g) => ({ label: GENDER_LABELS[g] ?? g, value: g }));
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    const sortField = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
    if (sortField) {
      this.sortField = sortField;
      this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
    }
    this.fetch();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  applyFilters(): void {
    this.first = 0;
    this.fetch();
  }

  clearFilters(): void {
    this.search = '';
    this.filterCourse = null;
    this.filterYear = null;
    this.filterGender = null;
    this.applyFilters();
  }

  private fetch(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1;
    this.studentService
      .list({
        page,
        limit: this.rows,
        search: this.search,
        course: this.filterCourse,
        year: this.filterYear,
        gender: this.filterGender,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
      })
      .subscribe({
        next: (result) => {
          this.students = result.data;
          this.total = result.total;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messages.add({
            severity: 'error',
            summary: 'Failed to load students',
            detail: 'Could not reach the server. Please try again.',
          });
        },
      });
  }

  openCreate(): void {
    this.selected = null;
    this.dialogVisible = true;
  }

  openEdit(student: Student): void {
    this.selected = student;
    this.dialogVisible = true;
  }

  onSaved(student: Student): void {
    this.messages.add({
      severity: 'success',
      summary: this.selected ? 'Student updated' : 'Student added',
      detail: `${student.name} (${student.admissionNumber})`,
    });
    this.fetch();
  }

  confirmDelete(student: Student): void {
    this.confirm.confirm({
      header: 'Delete student',
      message: `Delete ${student.name} (${student.admissionNumber})? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => this.remove(student),
    });
  }

  private remove(student: Student): void {
    this.studentService.remove(student.id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Student deleted',
          detail: `${student.name} was removed.`,
        });
        // Step back a page if the last row on the final page was just deleted.
        if (this.students.length === 1 && this.first >= this.rows) {
          this.first -= this.rows;
        }
        this.fetch();
      },
      error: () => {
        this.messages.add({ severity: 'error', summary: 'Delete failed', detail: 'Please try again.' });
      },
    });
  }

  genderLabel(gender: string): string {
    return GENDER_LABELS[gender] ?? gender;
  }

  genderSeverity(gender: string): 'info' | 'success' | 'secondary' {
    return GENDER_SEVERITY[gender] ?? 'secondary';
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }
}

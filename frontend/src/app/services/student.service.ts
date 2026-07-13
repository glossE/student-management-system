import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult, Student, StudentMeta, StudentQuery } from '../models/student';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);
  private readonly base = '/api/students';

  list(query: StudentQuery): Observable<PagedResult<Student>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    if (query.search) params = params.set('search', query.search);
    if (query.course) params = params.set('course', query.course);
    if (query.year != null) params = params.set('year', query.year);
    if (query.gender) params = params.set('gender', query.gender);
    if (query.sortField) params = params.set('sortField', query.sortField);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);

    return this.http.get<PagedResult<Student>>(this.base, { params });
  }

  create(payload: FormData): Observable<Student> {
    return this.http.post<Student>(this.base, payload);
  }

  update(id: number, payload: FormData): Observable<Student> {
    return this.http.put<Student>(`${this.base}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  meta(): Observable<StudentMeta> {
    return this.http.get<StudentMeta>('/api/meta');
  }
}

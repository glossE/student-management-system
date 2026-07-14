import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserPayload, StaffUser } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly base = '/api/users';

  list(): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(this.base);
  }

  create(payload: CreateUserPayload): Observable<StaffUser> {
    return this.http.post<StaffUser>(this.base, payload);
  }

  setActive(id: number, isActive: boolean): Observable<StaffUser> {
    return this.http.patch<StaffUser>(`${this.base}/${id}/active`, { isActive });
  }
}

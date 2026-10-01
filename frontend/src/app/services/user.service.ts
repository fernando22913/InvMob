import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  PaginatedResponse,
  PaginationParams,
  User,
  UserCreate,
  UserUpdate,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  create(body: UserCreate): Observable<User> {
    return this.http.post<User>(this.base, body);
  }

  update(id: number, body: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

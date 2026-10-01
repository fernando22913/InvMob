import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  Category,
  CategoryCreate,
  CategoryUpdate,
  PaginatedResponse,
  PaginationParams,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly base = `${environment.apiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Category>> {
    return this.http.get<PaginatedResponse<Category>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  create(body: CategoryCreate): Observable<Category> {
    return this.http.post<Category>(this.base, body);
  }

  update(id: number, body: CategoryUpdate): Observable<Category> {
    return this.http.put<Category>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

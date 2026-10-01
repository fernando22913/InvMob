import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  PaginatedResponse,
  PaginationParams,
  Supplier,
  SupplierCreate,
  SupplierUpdate,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly base = `${environment.apiUrl}/suppliers`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Supplier>> {
    return this.http.get<PaginatedResponse<Supplier>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  create(body: SupplierCreate): Observable<Supplier> {
    return this.http.post<Supplier>(this.base, body);
  }

  update(id: number, body: SupplierUpdate): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

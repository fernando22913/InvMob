import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  PaginatedResponse,
  PaginationParams,
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly base = `${environment.apiUrl}/warehouses`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Warehouse>> {
    return this.http.get<PaginatedResponse<Warehouse>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  create(body: WarehouseCreate): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.base, body);
  }

  update(id: number, body: WarehouseUpdate): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

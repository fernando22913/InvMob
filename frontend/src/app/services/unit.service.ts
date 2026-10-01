import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  PaginatedResponse,
  PaginationParams,
  Unit,
  UnitCreate,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private readonly base = `${environment.apiUrl}/units`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Unit>> {
    return this.http.get<PaginatedResponse<Unit>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  create(body: UnitCreate): Observable<Unit> {
    return this.http.post<Unit>(this.base, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

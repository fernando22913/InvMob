import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { PaginatedResponse, PaginationParams, Sale, SaleCreate } from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly base = `${environment.apiUrl}/sales`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Sale>> {
    return this.http.get<PaginatedResponse<Sale>>(this.base, {
      params: buildParams({ page: params.page, size: params.size }),
    });
  }

  get(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.base}/${id}`);
  }

  create(body: SaleCreate): Observable<Sale> {
    return this.http.post<Sale>(this.base, body);
  }
}

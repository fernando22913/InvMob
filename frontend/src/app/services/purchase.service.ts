import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  PaginatedResponse,
  PaginationParams,
  Purchase,
  PurchaseCreate,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly base = `${environment.apiUrl}/purchases`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Purchase>> {
    return this.http.get<PaginatedResponse<Purchase>>(this.base, {
      params: buildParams({ page: params.page, size: params.size }),
    });
  }

  get(id: number): Observable<Purchase> {
    return this.http.get<Purchase>(`${this.base}/${id}`);
  }

  create(body: PurchaseCreate): Observable<Purchase> {
    return this.http.post<Purchase>(this.base, body);
  }
}

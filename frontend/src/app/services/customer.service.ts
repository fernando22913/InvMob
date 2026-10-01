import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  Customer,
  CustomerCreate,
  CustomerUpdate,
  PaginatedResponse,
  PaginationParams,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly base = `${environment.apiUrl}/customers`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Customer>> {
    return this.http.get<PaginatedResponse<Customer>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  create(body: CustomerCreate): Observable<Customer> {
    return this.http.post<Customer>(this.base, body);
  }

  update(id: number, body: CustomerUpdate): Observable<Customer> {
    return this.http.put<Customer>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

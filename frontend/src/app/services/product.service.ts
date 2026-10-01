import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  PaginatedResponse,
  PaginationParams,
  Product,
  ProductCreate,
  ProductUpdate,
} from '../models';
import { buildParams } from './http-utils';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly base = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  list(params: PaginationParams = {}): Observable<PaginatedResponse<Product>> {
    return this.http.get<PaginatedResponse<Product>>(this.base, {
      params: buildParams({ page: params.page, size: params.size, search: params.search }),
    });
  }

  /**
   * Pages through every product (max page size is 100). Used by pickers that
   * must offer the full catalogue, not just the first page.
   */
  listAll(): Observable<Product[]> {
    return this.list({ page: 1, size: 100 }).pipe(
      switchMap((first) => {
        if (first.pages <= 1) return of(first.items);
        const requests: Observable<PaginatedResponse<Product>>[] = [];
        for (let page = 2; page <= first.pages; page++) {
          requests.push(this.list({ page, size: 100 }));
        }
        return forkJoin(requests).pipe(
          map((rest) => [
            ...first.items,
            ...rest.flatMap((page) => page.items),
          ])
        );
      })
    );
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  create(body: ProductCreate): Observable<Product> {
    return this.http.post<Product>(this.base, body);
  }

  update(id: number, body: ProductUpdate): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}

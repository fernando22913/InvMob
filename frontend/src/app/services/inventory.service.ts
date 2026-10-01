import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  AdjustmentCreate,
  InventoryMovement,
  PaginatedResponse,
  PaginationParams,
  StockItem,
} from '../models';
import { buildParams } from './http-utils';

export interface StockQuery extends PaginationParams {
  product_id?: number;
  warehouse_id?: number;
}

export interface MovementQuery extends StockQuery {
  movement_type?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly base = `${environment.apiUrl}/inventory`;

  constructor(private readonly http: HttpClient) {}

  listStock(params: StockQuery = {}): Observable<PaginatedResponse<StockItem>> {
    return this.http.get<PaginatedResponse<StockItem>>(`${this.base}/stock`, {
      params: buildParams({
        page: params.page,
        size: params.size,
        product_id: params.product_id,
        warehouse_id: params.warehouse_id,
      }),
    });
  }

  /** Pages through every stock row (used by the dashboard totals). */
  listAllStock(params: Omit<StockQuery, 'page' | 'size'> = {}): Observable<StockItem[]> {
    return this.listStock({ ...params, page: 1, size: 100 }).pipe(
      switchMap((first) => {
        if (first.pages <= 1) return of(first.items);
        const requests: Observable<PaginatedResponse<StockItem>>[] = [];
        for (let page = 2; page <= first.pages; page++) {
          requests.push(this.listStock({ ...params, page, size: 100 }));
        }
        return forkJoin(requests).pipe(
          map((rest) => [...first.items, ...rest.flatMap((p) => p.items)])
        );
      })
    );
  }

  listMovements(
    params: MovementQuery = {}
  ): Observable<PaginatedResponse<InventoryMovement>> {
    return this.http.get<PaginatedResponse<InventoryMovement>>(
      `${this.base}/movements`,
      {
        params: buildParams({
          page: params.page,
          size: params.size,
          product_id: params.product_id,
          warehouse_id: params.warehouse_id,
          movement_type: params.movement_type,
        }),
      }
    );
  }

  adjust(body: AdjustmentCreate): Observable<{ detail: string; new_quantity: number }> {
    return this.http.post<{ detail: string; new_quantity: number }>(
      `${this.base}/adjustments`,
      body
    );
  }
}

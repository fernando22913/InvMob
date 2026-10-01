import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import {
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ProductService } from '../../services/product.service';
import { InventoryService } from '../../services/inventory.service';
import { PurchaseService } from '../../services/purchase.service';
import { SaleService } from '../../services/sale.service';
import { formatCurrency, formatDate } from '../../shared/format';
import type {
  PaginatedResponse,
  Product,
  Purchase,
  Sale,
  StockItem,
} from '../../models';

interface LowStockRow {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  minimum: number;
}

interface DashboardVM {
  productCount: number;
  totalStock: number;
  lowStockCount: number;
  purchaseCount: number;
  saleCount: number;
  recentPurchases: Purchase[];
  recentSales: Sale[];
  lowStockProducts: LowStockRow[];
}

function emptyPage<T>(size: number): PaginatedResponse<T> {
  return { items: [], total: 0, page: 1, size, pages: 0 };
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    AsyncPipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonSpinner,
  ],
})
export class DashboardPage {
  private readonly products = inject(ProductService);
  private readonly inventory = inject(InventoryService);
  private readonly purchases = inject(PurchaseService);
  private readonly sales = inject(SaleService);

  readonly currency = formatCurrency;
  readonly date = formatDate;

  readonly vm$: Observable<DashboardVM> = forkJoin({
    products: this.products
      .listAll()
      .pipe(catchError(() => of([] as Product[]))),
    stock: this.inventory
      .listAllStock()
      .pipe(catchError(() => of([] as StockItem[]))),
    purchases: this.purchases
      .list({ page: 1, size: 5 })
      .pipe(catchError(() => of(emptyPage<Purchase>(5)))),
    sales: this.sales
      .list({ page: 1, size: 5 })
      .pipe(catchError(() => of(emptyPage<Sale>(5)))),
  }).pipe(
    map(({ products, stock, purchases, sales }) => {
      const lowStock = products.filter((p) => {
        if (!p.is_active) return false;
        const rows = stock.filter((s) => s.product_id === p.id);
        return rows.some(
          (s) => s.minimum_stock > 0 && s.quantity <= s.minimum_stock
        );
      });

      const lowStockProducts: LowStockRow[] = lowStock.slice(0, 5).map((p) => {
        const rows = stock.filter((s) => s.product_id === p.id);
        const minimums = rows
          .filter((s) => s.minimum_stock > 0)
          .map((s) => s.minimum_stock);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: rows.reduce((sum, s) => sum + s.quantity, 0),
          minimum: minimums.length > 0 ? Math.min(...minimums) : 0,
        };
      });

      return {
        productCount: products.length,
        totalStock: stock.reduce((sum, s) => sum + s.quantity, 0),
        lowStockCount: lowStock.length,
        purchaseCount: purchases.total,
        saleCount: sales.total,
        recentPurchases: purchases.items,
        recentSales: sales.items,
        lowStockProducts,
      };
    })
  );
}

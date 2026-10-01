import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  shareReplay,
  switchMap,
} from 'rxjs';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { WarehouseService } from '../../services/warehouse.service';
import { extractApiError } from '../../core/api-error';
import { formatDateTime } from '../../shared/format';
import { toListState, type ListState } from '../../shared/list-state';
import type {
  InventoryMovement,
  Product,
  StockItem,
  Warehouse,
} from '../../models';

type Tab = 'stock' | 'movements';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonModal,
    IonInput,
    IonNote,
    IonSpinner,
    IonBadge,
    IonList,
    IonItem,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class InventoryPage implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly dateTime = formatDateTime;

  tab: Tab = 'stock';
  readonly movementTypes = [
    { value: 'purchase', label: 'Compra' },
    { value: 'sale', label: 'Venta' },
    { value: 'adjustment', label: 'Ajuste' },
    { value: 'return', label: 'Devolución' },
    { value: 'transfer', label: 'Transferencia' },
  ];

  products: Product[] = [];
  warehouses: Warehouse[] = [];

  private readonly productFilter = new BehaviorSubject<number | null>(null);
  private readonly warehouseFilter = new BehaviorSubject<number | null>(null);
  private readonly typeFilter = new BehaviorSubject<string>('');
  private readonly page = new BehaviorSubject<number>(1);
  private readonly refreshTick = new BehaviorSubject<void>(undefined);

  readonly stockState$: Observable<ListState<StockItem>> = combineLatest([
    this.productFilter,
    this.warehouseFilter,
    this.page,
    this.refreshTick,
  ]).pipe(
    switchMap(([productId, warehouseId, page]) =>
      toListState(
        this.inventory.listStock({
          product_id: productId ?? undefined,
          warehouse_id: warehouseId ?? undefined,
          page,
          size: 20,
        })
      )
    ),
    shareReplay(1)
  );

  readonly movementState$: Observable<ListState<InventoryMovement>> =
    combineLatest([
      this.productFilter,
      this.warehouseFilter,
      this.typeFilter,
      this.page,
      this.refreshTick,
    ]).pipe(
      switchMap(([productId, warehouseId, type, page]) =>
        toListState(
          this.inventory.listMovements({
            product_id: productId ?? undefined,
            warehouse_id: warehouseId ?? undefined,
            movement_type: type || undefined,
            page,
            size: 20,
          })
        )
      ),
      shareReplay(1)
    );

  showAdjust = false;
  saving = false;
  currentStock: number | null = null;
  currentStockLoading = false;

  readonly form = this.fb.nonNullable.group({
    product_id: [0, [Validators.required, Validators.min(1)]],
    warehouse_id: [0, [Validators.required, Validators.min(1)]],
    quantity: [0, [Validators.required, Validators.pattern(/^-?\d+$/)]],
    notes: [''],
  });

  constructor() {
    this.form.controls.product_id.valueChanges.subscribe(() =>
      this.loadCurrentStock()
    );
    this.form.controls.warehouse_id.valueChanges.subscribe(() =>
      this.loadCurrentStock()
    );
  }

  ngOnInit(): void {
    this.productService.listAll().subscribe({
      next: (items) => {
        this.products = items;
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
    this.warehouseService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.warehouses = res.items;
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  get f() {
    return this.form.controls;
  }

  onTabChange(event: CustomEvent): void {
    this.tab = (event.detail as { value: Tab }).value;
    this.page.next(1);
  }

  onProductFilter(event: CustomEvent): void {
    const value = (event.detail as { value: number | null }).value;
    this.productFilter.next(value ?? null);
    this.page.next(1);
  }

  onWarehouseFilter(event: CustomEvent): void {
    const value = (event.detail as { value: number | null }).value;
    this.warehouseFilter.next(value ?? null);
    this.page.next(1);
  }

  onTypeFilter(event: CustomEvent): void {
    const value = (event.detail as { value: string | null }).value;
    this.typeFilter.next(value ?? '');
    this.page.next(1);
  }

  productName(id: number | null): string {
    if (id === null) return '—';
    return this.products.find((p) => p.id === id)?.name ?? `#${id}`;
  }

  warehouseName(id: number | null): string {
    if (id === null) return '—';
    return this.warehouses.find((w) => w.id === id)?.name ?? `#${id}`;
  }

  stockStatus(item: StockItem): { label: string; color: string } {
    if (item.quantity === 0) return { label: 'Sin stock', color: 'danger' };
    if (item.minimum_stock > 0 && item.quantity <= item.minimum_stock) {
      return { label: 'Stock bajo', color: 'warning' };
    }
    return { label: 'Disponible', color: 'success' };
  }

  movementLabel(type: string): string {
    return this.movementTypes.find((t) => t.value === type)?.label ?? type;
  }

  movementColor(type: string): string {
    switch (type) {
      case 'purchase':
        return 'success';
      case 'sale':
        return 'primary';
      case 'adjustment':
        return 'warning';
      default:
        return 'medium';
    }
  }

  goToPage(page: number, state: ListState<StockItem | InventoryMovement>): void {
    if (!state.data || page < 1 || page === state.data.page) return;
    this.page.next(page);
  }

  refresh(event: CustomEvent): void {
    this.refreshTick.next();
    const target = event.target as unknown as { complete: () => Promise<void> };
    void target.complete();
  }

  reload(): void {
    this.refreshTick.next();
  }

  openAdjust(): void {
    this.form.reset({ product_id: 0, warehouse_id: 0, quantity: 0, notes: '' });
    this.currentStock = null;
    this.showAdjust = true;
  }

  closeAdjust(): void {
    this.showAdjust = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void this.toast('Completa los campos obligatorios', 'warning');
      return;
    }
    const raw = this.form.getRawValue();
    this.saving = true;
    this.inventory
      .adjust({
        product_id: Number(raw.product_id),
        warehouse_id: Number(raw.warehouse_id),
        quantity: Number(raw.quantity),
        notes: raw.notes.trim() || null,
      })
      .subscribe({
        next: async (res) => {
          this.saving = false;
          this.showAdjust = false;
          this.cdr.markForCheck();
          await this.toast(
            `Ajuste aplicado. Nuevo stock: ${res.new_quantity}`,
            'success'
          );
          this.reload();
        },
        error: async (err: unknown) => {
          this.saving = false;
          this.cdr.markForCheck();
          const alert = await this.alertCtrl.create({
            header: 'No se pudo aplicar el ajuste',
            message: extractApiError(err),
            buttons: ['Aceptar'],
          });
          await alert.present();
        },
      });
  }

  private loadCurrentStock(): void {
    const productId = Number(this.form.controls.product_id.value);
    const warehouseId = Number(this.form.controls.warehouse_id.value);
    if (!productId || !warehouseId) {
      this.currentStock = null;
      this.cdr.markForCheck();
      return;
    }
    this.currentStockLoading = true;
    this.inventory
      .listStock({ product_id: productId, warehouse_id: warehouseId, size: 1 })
      .subscribe({
        next: (res) => {
          this.currentStock = res.items[0]?.quantity ?? 0;
          this.currentStockLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.currentStock = null;
          this.currentStockLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private async toast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}

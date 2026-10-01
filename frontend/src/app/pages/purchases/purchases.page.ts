import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { PurchaseService } from '../../services/purchase.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { WarehouseService } from '../../services/warehouse.service';
import { extractApiError } from '../../core/api-error';
import { formatCurrency, formatDate } from '../../shared/format';
import { toListState, type ListState } from '../../shared/list-state';
import type {
  Product,
  Purchase,
  PurchaseCreate,
  Supplier,
  Warehouse,
} from '../../models';

@Component({
  selector: 'app-purchases',
  templateUrl: './purchases.page.html',
  styleUrls: ['./purchases.page.scss'],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
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
    IonButton,
    IonIcon,
    IonModal,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class PurchasesPage implements OnInit {
  private readonly purchaseService = inject(PurchaseService);
  private readonly productService = inject(ProductService);
  private readonly supplierService = inject(SupplierService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currency = formatCurrency;
  readonly date = formatDate;

  private readonly page = new BehaviorSubject<number>(1);
  private readonly refreshTick = new BehaviorSubject<void>(undefined);

  readonly state$: Observable<ListState<Purchase>> = combineLatest([
    this.page,
    this.refreshTick,
  ]).pipe(
    switchMap(([page]) =>
      toListState(this.purchaseService.list({ page, size: 20 }))
    ),
    shareReplay(1)
  );

  products: Product[] = [];
  suppliers: Supplier[] = [];
  warehouses: Warehouse[] = [];

  showCreate = false;
  saving = false;
  total = 0;

  showDetail = false;
  viewing: Purchase | null = null;
  viewingLoading = false;
  viewingError = '';

  readonly form = this.fb.nonNullable.group({
    supplier_id: [null as number | null],
    warehouse_id: [null as number | null, [Validators.required]],
    reference_number: [''],
    notes: [''],
    items: this.fb.array([this.createItemGroup()]),
  });

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.total = this.computeTotal();
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.productService.listAll().subscribe({
      next: (items) => {
        this.products = items.filter((p) => p.is_active);
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
    this.supplierService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.suppliers = res.items.filter((s) => s.is_active);
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
    this.warehouseService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.warehouses = res.items.filter((w) => w.is_active);
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  get f() {
    return this.form.controls;
  }

  get items(): FormArray {
    return this.form.controls.items;
  }

  get itemGroups(): FormGroup[] {
    return this.items.controls as FormGroup[];
  }

  createItemGroup(): FormGroup {
    return this.fb.nonNullable.group({
      product_id: [0, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: ['0.00', [Validators.required, Validators.min(0)]],
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  onProductChange(index: number): void {
    const group = this.itemGroups[index];
    const productId = Number(group.get('product_id')?.value);
    const product = this.products.find((p) => p.id === productId);
    if (product) {
      group.get('unit_price')?.setValue(product.purchase_price);
    }
  }

  subtotalFor(index: number): number {
    const group = this.itemGroups[index];
    const quantity = Number(group?.get('quantity')?.value) || 0;
    const price = Number(group?.get('unit_price')?.value) || 0;
    return Math.round(quantity * price * 100) / 100;
  }

  goToPage(page: number): void {
    if (page < 1 || page === this.page.value) return;
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

  openCreate(): void {
    this.form.reset({
      supplier_id: null,
      warehouse_id: null,
      reference_number: '',
      notes: '',
    });
    this.items.clear();
    this.items.push(this.createItemGroup());
    this.total = 0;
    this.showCreate = true;
  }

  closeCreate(): void {
    this.showCreate = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void this.toast('Completa los campos obligatorios', 'warning');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: PurchaseCreate = {
      supplier_id: raw.supplier_id ?? null,
      warehouse_id: raw.warehouse_id,
      reference_number: raw.reference_number.trim() || null,
      notes: raw.notes.trim() || null,
      items: raw.items.map((item) => ({
        product_id: Number(item['product_id']),
        quantity: Number(item['quantity']),
        unit_price: String(item['unit_price']),
      })),
    };

    this.saving = true;
    this.purchaseService.create(payload).subscribe({
      next: async () => {
        this.saving = false;
        this.showCreate = false;
        this.cdr.markForCheck();
        await this.toast('Compra registrada, stock actualizado', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        this.saving = false;
        this.cdr.markForCheck();
        const alert = await this.alertCtrl.create({
          header: 'No se pudo registrar la compra',
          message: extractApiError(err),
          buttons: ['Aceptar'],
        });
        await alert.present();
      },
    });
  }

  openDetail(purchase: Purchase): void {
    this.showDetail = true;
    this.viewing = null;
    this.viewingError = '';
    this.viewingLoading = true;
    this.purchaseService.get(purchase.id).subscribe({
      next: (detail) => {
        this.viewing = detail;
        this.viewingLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.viewingError = extractApiError(err);
        this.viewingLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetail(): void {
    this.showDetail = false;
  }

  supplierName(id: number | null): string {
    return this.suppliers.find((s) => s.id === id)?.name ?? '—';
  }

  warehouseName(id: number | null): string {
    return this.warehouses.find((w) => w.id === id)?.name ?? '—';
  }

  productName(id: number | null): string {
    return this.products.find((p) => p.id === id)?.name ?? (id ? `#${id}` : '—');
  }

  private computeTotal(): number {
    let sum = 0;
    for (const control of this.items.controls) {
      const group = control as FormGroup;
      const quantity = Number(group.get('quantity')?.value) || 0;
      const price = Number(group.get('unit_price')?.value) || 0;
      sum += quantity * price;
    }
    return Math.round(sum * 100) / 100;
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

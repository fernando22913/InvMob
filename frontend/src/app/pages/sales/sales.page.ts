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
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  startWith,
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

import { SaleService } from '../../services/sale.service';
import { ProductService } from '../../services/product.service';
import { CustomerService } from '../../services/customer.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory.service';
import { extractApiError } from '../../core/api-error';
import { formatCurrency, formatDate } from '../../shared/format';
import type {
  Customer,
  PaginatedResponse,
  Product,
  Sale,
  SaleCreate,
  Warehouse,
} from '../../models';

interface ListState {
  loading: boolean;
  error: string | null;
  data: PaginatedResponse<Sale> | null;
}

@Component({
  selector: 'app-sales',
  templateUrl: './sales.page.html',
  styleUrls: ['./sales.page.scss'],
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
export class SalesPage implements OnInit {
  private readonly saleService = inject(SaleService);
  private readonly productService = inject(ProductService);
  private readonly customerService = inject(CustomerService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly inventory = inject(InventoryService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currency = formatCurrency;
  readonly date = formatDate;

  private readonly page = new BehaviorSubject<number>(1);
  private readonly refreshTick = new BehaviorSubject<void>(undefined);

  readonly state$: Observable<ListState> = combineLatest([
    this.page,
    this.refreshTick,
  ]).pipe(
    switchMap(([page]) =>
      this.saleService.list({ page, size: 20 }).pipe(
        map((data) => ({ loading: false, error: null, data })),
        startWith({ loading: true, error: null, data: null }),
        catchError((err) =>
          of({ loading: false, error: extractApiError(err), data: null })
        )
      )
    ),
    shareReplay(1)
  );

  products: Product[] = [];
  customers: Customer[] = [];
  warehouses: Warehouse[] = [];
  stockByProduct: Record<number, number> = {};

  showCreate = false;
  saving = false;
  total = 0;

  showDetail = false;
  viewing: Sale | null = null;
  viewingLoading = false;
  viewingError = '';

  readonly form = this.fb.nonNullable.group({
    customer_id: [null as number | null],
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
    this.form.controls.warehouse_id.valueChanges.subscribe((warehouseId) => {
      this.loadWarehouseStock(warehouseId);
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
    this.customerService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.customers = res.items;
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
      group.get('unit_price')?.setValue(product.sale_price);
    }
  }

  availableFor(productId: number): number {
    return this.stockByProduct[productId] ?? 0;
  }

  availableAt(index: number): number {
    const productId = Number(this.itemGroups[index]?.get('product_id')?.value);
    return this.availableFor(productId);
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
      customer_id: null,
      warehouse_id: null,
      reference_number: '',
      notes: '',
    });
    this.items.clear();
    this.items.push(this.createItemGroup());
    this.stockByProduct = {};
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
    const payload: SaleCreate = {
      customer_id: raw.customer_id ?? null,
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
    this.saleService.create(payload).subscribe({
      next: async () => {
        this.saving = false;
        this.showCreate = false;
        this.cdr.markForCheck();
        await this.toast('Venta registrada', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        this.saving = false;
        this.cdr.markForCheck();
        const message = extractApiError(err);
        const alert = await this.alertCtrl.create({
          header: 'No se pudo registrar la venta',
          message,
          buttons: ['Aceptar'],
        });
        await alert.present();
      },
    });
  }

  openDetail(sale: Sale): void {
    this.showDetail = true;
    this.viewing = null;
    this.viewingError = '';
    this.viewingLoading = true;
    this.saleService.get(sale.id).subscribe({
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

  customerName(id: number | null): string {
    return this.customers.find((c) => c.id === id)?.name ?? '—';
  }

  warehouseName(id: number | null): string {
    return this.warehouses.find((w) => w.id === id)?.name ?? '—';
  }

  productName(id: number | null): string {
    return (
      this.products.find((p) => p.id === id)?.name ??
      (id ? `#${id}` : '—')
    );
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

  private loadWarehouseStock(warehouseId: number | null): void {
    this.stockByProduct = {};
    if (!warehouseId) return;
    this.inventory.listStock({ warehouse_id: warehouseId, size: 100 }).subscribe({
      next: (res) => {
        const map: Record<number, number> = {};
        for (const item of res.items) {
          map[item.product_id] = (map[item.product_id] ?? 0) + item.quantity;
        }
        this.stockByProduct = map;
        this.cdr.markForCheck();
      },
      error: () => {
        this.stockByProduct = {};
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

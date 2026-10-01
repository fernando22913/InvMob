import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
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
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { UnitService } from '../../services/unit.service';
import { extractApiError } from '../../core/api-error';
import { formatCurrency } from '../../shared/format';
import type {
  Category,
  PaginatedResponse,
  Product,
  ProductCreate,
  Unit,
} from '../../models';

interface ListState {
  loading: boolean;
  error: string | null;
  data: PaginatedResponse<Product> | null;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonSearchbar,
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
    IonToggle,
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ProductsPage implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly unitService = inject(UnitService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currency = formatCurrency;

  readonly searchControl = this.fb.nonNullable.control('');
  private readonly query = new BehaviorSubject<{ search: string; page: number }>({
    search: '',
    page: 1,
  });
  private readonly refreshTick = new BehaviorSubject<void>(undefined);

  readonly state$: Observable<ListState> = combineLatest([
    this.query,
    this.refreshTick,
  ]).pipe(
    switchMap(([q]) =>
      this.productService
        .list({
          search: q.search.trim() || undefined,
          page: q.page,
          size: 20,
        })
        .pipe(
          map((data) => ({ loading: false, error: null, data })),
          startWith({ loading: true, error: null, data: null }),
          catchError((err) =>
            of({ loading: false, error: extractApiError(err), data: null })
          )
        )
    ),
    shareReplay(1)
  );

  categories: Category[] = [];
  units: Unit[] = [];

  showForm = false;
  editingId: number | null = null;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category_id: [null as number | null],
    unit_id: [null as number | null],
    purchase_price: ['0.00', [Validators.required, Validators.min(0)]],
    sale_price: ['0.00', [Validators.required, Validators.min(0)]],
    min_stock: [0, [Validators.min(0)]],
    is_active: [true],
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((search) => this.query.next({ search, page: 1 }));
  }

  ngOnInit(): void {
    this.categoryService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.categories = res.items;
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
    this.unitService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.units = res.items;
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  get f() {
    return this.form.controls;
  }

  onSearchInput(event: CustomEvent): void {
    const value = (event.detail as { value?: string | null }).value ?? '';
    this.searchControl.setValue(value);
  }

  goToPage(page: number): void {
    if (page < 1 || page === this.query.value.page) return;
    this.query.next({ ...this.query.value, page });
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
    this.editingId = null;
    this.form.reset({
      name: '',
      sku: '',
      description: '',
      category_id: null,
      unit_id: null,
      purchase_price: '0.00',
      sale_price: '0.00',
      min_stock: 0,
      is_active: true,
    });
    this.showForm = true;
  }

  openEdit(product: Product): void {
    this.editingId = product.id;
    this.form.reset({
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      category_id: product.category_id,
      unit_id: product.unit_id,
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      min_stock: product.min_stock,
      is_active: product.is_active,
    });
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue();
    const payload: ProductCreate = {
      name: raw.name.trim(),
      sku: raw.sku.trim(),
      description: raw.description.trim() || null,
      category_id: raw.category_id ?? null,
      unit_id: raw.unit_id ?? null,
      purchase_price: raw.purchase_price,
      sale_price: raw.sale_price,
      min_stock: Number(raw.min_stock) || 0,
      is_active: raw.is_active,
    };

    const request$ = this.editingId
      ? this.productService.update(this.editingId, payload)
      : this.productService.create(payload);

    request$.subscribe({
      next: async () => {
        this.saving = false;
        const message = this.editingId
          ? 'Producto actualizado'
          : 'Producto creado';
        this.showForm = false;
        this.cdr.markForCheck();
        await this.toast(message, 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        this.saving = false;
        this.cdr.markForCheck();
        await this.toast(extractApiError(err), 'danger');
      },
    });
  }

  async confirmDelete(product: Product): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Desactivar producto',
      message: `¿Desactivar "${product.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.delete(product),
        },
      ],
    });
    await alert.present();
  }

  private delete(product: Product): void {
    this.productService.remove(product.id).subscribe({
      next: async () => {
        await this.toast('Producto desactivado', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        await this.toast(extractApiError(err), 'danger');
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

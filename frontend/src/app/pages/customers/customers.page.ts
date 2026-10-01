import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
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
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { CustomerService } from '../../services/customer.service';
import { extractApiError } from '../../core/api-error';
import { toListState, type ListState } from '../../shared/list-state';
import type { Customer, CustomerCreate } from '../../models';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.scss'],
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
    IonNote,
    IonSpinner,
    IonToggle,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class CustomersPage {
  private readonly customerService = inject(CustomerService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly searchControl = this.fb.nonNullable.control('');
  private readonly query = new BehaviorSubject<{ search: string; page: number }>({
    search: '',
    page: 1,
  });
  private readonly refreshTick = new BehaviorSubject<void>(undefined);

  readonly state$: Observable<ListState<Customer>> = combineLatest([
    this.query,
    this.refreshTick,
  ]).pipe(
    switchMap(([q]) =>
      toListState(
        this.customerService.list({
          search: q.search.trim() || undefined,
          page: q.page,
          size: 20,
        })
      )
    ),
    shareReplay(1)
  );

  showForm = false;
  editingId: number | null = null;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    tax_id: [''],
    is_active: [true],
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((search) => this.query.next({ search, page: 1 }));
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
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      is_active: true,
    });
    this.showForm = true;
  }

  openEdit(customer: Customer): void {
    this.editingId = customer.id;
    this.form.reset({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      tax_id: customer.tax_id ?? '',
      is_active: customer.is_active,
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
    const payload: CustomerCreate = {
      name: raw.name.trim(),
      email: raw.email.trim() || null,
      phone: raw.phone.trim() || null,
      address: raw.address.trim() || null,
      tax_id: raw.tax_id.trim() || null,
      is_active: raw.is_active,
    };

    const request$ = this.editingId
      ? this.customerService.update(this.editingId, payload)
      : this.customerService.create(payload);

    request$.subscribe({
      next: async () => {
        this.saving = false;
        const message = this.editingId
          ? 'Cliente actualizado'
          : 'Cliente creado';
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

  async confirmDelete(customer: Customer): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Desactivar cliente',
      message: `¿Desactivar "${customer.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.delete(customer),
        },
      ],
    });
    await alert.present();
  }

  private delete(customer: Customer): void {
    this.customerService.remove(customer.id).subscribe({
      next: async () => {
        await this.toast('Cliente desactivado', 'success');
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

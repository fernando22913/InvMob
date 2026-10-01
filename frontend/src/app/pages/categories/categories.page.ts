import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { CategoryService } from '../../services/category.service';
import { extractApiError } from '../../core/api-error';
import { toListState, type ListState } from '../../shared/list-state';
import type { Category, CategoryCreate } from '../../models';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
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
export class CategoriesPage implements OnInit {
  private readonly categoryService = inject(CategoryService);
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

  readonly state$: Observable<ListState<Category>> = combineLatest([
    this.query,
    this.refreshTick,
  ]).pipe(
    switchMap(([q]) =>
      toListState(
        this.categoryService.list({
          search: q.search.trim() || undefined,
          page: q.page,
          size: 20,
        })
      )
    ),
    shareReplay(1)
  );

  allCategories: Category[] = [];
  showForm = false;
  editingId: number | null = null;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    parent_id: [null as number | null],
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((search) => this.query.next({ search, page: 1 }));
  }

  ngOnInit(): void {
    this.loadAll();
  }

  get f() {
    return this.form.controls;
  }

  get parentOptions(): Category[] {
    return this.allCategories.filter((c) => c.id !== this.editingId);
  }

  parentName(id: number | null): string {
    if (id === null) return '—';
    return this.allCategories.find((c) => c.id === id)?.name ?? `#${id}`;
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
    this.loadAll();
    const target = event.target as unknown as { complete: () => Promise<void> };
    void target.complete();
  }

  reload(): void {
    this.refreshTick.next();
    this.loadAll();
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ name: '', description: '', parent_id: null });
    this.showForm = true;
  }

  openEdit(category: Category): void {
    this.editingId = category.id;
    this.form.reset({
      name: category.name,
      description: category.description ?? '',
      parent_id: category.parent_id,
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
    const payload: CategoryCreate = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      parent_id: raw.parent_id ?? null,
    };

    const request$ = this.editingId
      ? this.categoryService.update(this.editingId, payload)
      : this.categoryService.create(payload);

    request$.subscribe({
      next: async () => {
        this.saving = false;
        const message = this.editingId
          ? 'Categoría actualizada'
          : 'Categoría creada';
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

  async confirmDelete(category: Category): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar categoría',
      message: `Esta acción eliminará "${category.name}" de forma permanente. ¿Continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.delete(category),
        },
      ],
    });
    await alert.present();
  }

  private delete(category: Category): void {
    this.categoryService.remove(category.id).subscribe({
      next: async () => {
        await this.toast('Categoría eliminada', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        await this.toast(extractApiError(err), 'danger');
      },
    });
  }

  private loadAll(): void {
    this.categoryService.list({ size: 100 }).subscribe({
      next: (res) => {
        this.allCategories = res.items;
        this.cdr.markForCheck();
      },
      error: () => undefined,
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

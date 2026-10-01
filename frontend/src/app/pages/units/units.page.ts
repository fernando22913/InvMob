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
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { UnitService } from '../../services/unit.service';
import { extractApiError } from '../../core/api-error';
import { toListState, type ListState } from '../../shared/list-state';
import type { Unit, UnitCreate } from '../../models';

@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss'],
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
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class UnitsPage {
  private readonly unitService = inject(UnitService);
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

  readonly state$: Observable<ListState<Unit>> = combineLatest([
    this.query,
    this.refreshTick,
  ]).pipe(
    switchMap(([q]) =>
      toListState(
        this.unitService.list({
          search: q.search.trim() || undefined,
          page: q.page,
          size: 20,
        })
      )
    ),
    shareReplay(1)
  );

  showForm = false;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    symbol: ['', [Validators.required, Validators.minLength(1)]],
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
    this.form.reset({ name: '', symbol: '' });
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
    const payload: UnitCreate = {
      name: raw.name.trim(),
      symbol: raw.symbol.trim(),
    };

    this.unitService.create(payload).subscribe({
      next: async () => {
        this.saving = false;
        this.showForm = false;
        this.cdr.markForCheck();
        await this.toast('Unidad creada', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        this.saving = false;
        this.cdr.markForCheck();
        await this.toast(extractApiError(err), 'danger');
      },
    });
  }

  async confirmDelete(unit: Unit): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar unidad',
      message: `Esta acción eliminará "${unit.name}" de forma permanente. ¿Continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.delete(unit),
        },
      ],
    });
    await alert.present();
  }

  private delete(unit: Unit): void {
    this.unitService.remove(unit.id).subscribe({
      next: async () => {
        await this.toast('Unidad eliminada', 'success');
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

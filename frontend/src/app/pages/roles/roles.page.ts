import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import {
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
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { RoleService } from '../../services/role.service';
import { extractApiError, isForbidden } from '../../core/api-error';
import { formatDate } from '../../shared/format';
import type { Role, RoleCreate } from '../../models';

interface RolesState {
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  roles: Role[];
}

@Component({
  selector: 'app-roles',
  templateUrl: './roles.page.html',
  styleUrls: ['./roles.page.scss'],
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
export class RolesPage {
  private readonly roleService = inject(RoleService);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly date = formatDate;

  private readonly refreshTick = new BehaviorSubject<void>(undefined);

  readonly state$: Observable<RolesState> = this.refreshTick.pipe(
    switchMap(() =>
      this.roleService.list().pipe(
        map((roles) => ({ loading: false, error: null, forbidden: false, roles })),
        startWith({ loading: true, error: null, forbidden: false, roles: [] }),
        catchError((err) =>
          of({
            loading: false,
            error: extractApiError(err),
            forbidden: isForbidden(err),
            roles: [] as Role[],
          })
        )
      )
    ),
    shareReplay(1)
  );

  showForm = false;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  get f() {
    return this.form.controls;
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
    this.form.reset({ name: '', description: '' });
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
    const payload: RoleCreate = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
    };

    this.roleService.create(payload).subscribe({
      next: async () => {
        this.saving = false;
        this.showForm = false;
        this.cdr.markForCheck();
        await this.toast('Rol creado', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        this.saving = false;
        this.cdr.markForCheck();
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

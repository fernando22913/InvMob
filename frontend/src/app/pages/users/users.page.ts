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

import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { extractApiError } from '../../core/api-error';
import { toListState, type ListState } from '../../shared/list-state';
import type { Role, User, UserCreate, UserUpdate } from '../../models';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
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
    IonNote,
    IonSpinner,
    IonToggle,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class UsersPage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
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

  readonly state$: Observable<ListState<User>> = combineLatest([
    this.query,
    this.refreshTick,
  ]).pipe(
    switchMap(([q]) =>
      toListState(
        this.userService.list({
          search: q.search.trim() || undefined,
          page: q.page,
          size: 20,
        })
      )
    ),
    shareReplay(1)
  );

  roles: Role[] = [];
  showForm = false;
  editingId: number | null = null;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    is_active: [true],
    role_ids: [[] as number[]],
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((search) => this.query.next({ search, page: 1 }));
  }

  ngOnInit(): void {
    this.loadRoles();
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
    this.loadRoles();
    const target = event.target as unknown as { complete: () => Promise<void> };
    void target.complete();
  }

  reload(): void {
    this.refreshTick.next();
    this.loadRoles();
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({
      full_name: '',
      email: '',
      password: '',
      is_active: true,
      role_ids: [],
    });
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(8),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.showForm = true;
  }

  openEdit(user: User): void {
    this.editingId = user.id;
    this.form.reset({
      full_name: user.full_name,
      email: user.email,
      password: '',
      is_active: user.is_active,
      role_ids: user.roles?.map((r) => r.id) ?? [],
    });
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
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

    const request$ = this.editingId
      ? this.userService.update(this.editingId, this.buildUpdate(raw))
      : this.userService.create(this.buildCreate(raw));

    request$.subscribe({
      next: async () => {
        this.saving = false;
        const message = this.editingId
          ? 'Usuario actualizado'
          : 'Usuario creado';
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

  async confirmDelete(user: User): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Desactivar usuario',
      message: `¿Desactivar a "${user.full_name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.delete(user),
        },
      ],
    });
    await alert.present();
  }

  private delete(user: User): void {
    this.userService.remove(user.id).subscribe({
      next: async () => {
        await this.toast('Usuario desactivado', 'success');
        this.reload();
      },
      error: async (err: unknown) => {
        await this.toast(extractApiError(err), 'danger');
      },
    });
  }

  private buildCreate(raw: {
    full_name: string;
    email: string;
    password: string;
    is_active: boolean;
    role_ids: number[];
  }): UserCreate {
    return {
      full_name: raw.full_name.trim(),
      email: raw.email.trim(),
      password: raw.password,
      is_active: raw.is_active,
      role_ids: raw.role_ids ?? [],
    };
  }

  private buildUpdate(raw: {
    full_name: string;
    email: string;
    password: string;
    is_active: boolean;
    role_ids: number[];
  }): UserUpdate {
    const payload: UserUpdate = {
      full_name: raw.full_name.trim(),
      email: raw.email.trim(),
      is_active: raw.is_active,
      role_ids: raw.role_ids ?? [],
    };
    if (raw.password) {
      payload.password = raw.password;
    }
    return payload;
  }

  private loadRoles(): void {
    this.roleService.list().subscribe({
      next: (roles) => {
        this.roles = roles;
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

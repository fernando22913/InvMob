import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonNote,
  IonSpinner,
} from '@ionic/angular';

import { AuthService } from '../../core/auth.service';
import { extractApiError } from '../../core/api-error';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonInput,
    IonButton,
    IonSpinner,
    IonNote,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  loading = false;
  error = '';
  showPassword = false;

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = extractApiError(err);
        this.cdr.markForCheck();
      },
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}

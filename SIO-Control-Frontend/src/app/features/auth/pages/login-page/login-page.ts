import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

function getAuthMessage(error: any) {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Usa iniciar sesion.',
    'auth/invalid-credential': 'Correo o contrasena incorrectos.',
    'auth/invalid-email': 'El correo no tiene un formato valido.',
    'auth/missing-password': 'Escribe tu contrasena.',
    'auth/operation-not-allowed': 'Ese metodo de acceso no esta habilitado en Firebase Authentication.',
    'auth/unauthorized-domain': 'Este dominio aun no esta autorizado en Firebase Authentication.',
    'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
  };
  return messages[error?.code] || 'No se pudo completar el acceso.';
}

@Component({
  selector: 'app-login-page',
  standalone: false,
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly auth = inject(AuthService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    effect(() => {
      if (this.auth.loading() || !this.auth.user()) {
        return;
      }

      void this.router.navigateByUrl(this.redirectUrl);
    });
  }

  get redirectUrl() {
    return this.route.snapshot.queryParamMap.get('redirect') || '/inventario/resumen';
  }

  async submit(mode: 'login' | 'register') {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const { email, password } = this.form.getRawValue();
      if (mode === 'register') {
        await this.auth.registerWithEmail(email, password);
      } else {
        await this.auth.loginWithEmail(email, password);
      }
    } catch (error: any) {
      this.error.set(getAuthMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle() {
    this.loading.set(true);
    this.error.set('');

    try {
      await this.auth.loginWithGoogle();
    } catch (error: any) {
      this.error.set(getAuthMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}

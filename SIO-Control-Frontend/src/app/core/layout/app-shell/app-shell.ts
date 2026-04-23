import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-app-shell',
  standalone: false,
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);
  readonly sidebarOpen = signal(false);

  readonly userLabel = computed(() => this.auth.user()?.displayName || this.auth.user()?.email || 'Usuario');
  readonly mainItems = computed(() => {
    const canAudit = this.auth.canAudit();
    return [
      { icon: 'bi-house', label: 'Inicio', to: '/inicio' },
      { icon: 'bi-grid', label: 'Resumen del dia', to: '/inventario/resumen' },
      { icon: 'bi-clipboard-check', label: 'Conteo', to: '/inventario/conteo' },
      { icon: 'bi-clock-history', label: 'Historial', to: '/inventario/historial' },
      ...(canAudit
        ? [
            { icon: 'bi-upload', label: 'Cargar inventario', to: '/inventario/cargar' },
            { icon: 'bi-arrow-left-right', label: 'Comparar conteos', to: '/inventario/comparar' },
            { icon: 'bi-broadcast', label: 'Supervisor', to: '/supervisor' },
            { icon: 'bi-file-earmark-bar-graph', label: 'Reportes', to: '/reportes' },
            { icon: 'bi-journal-text', label: 'Bitacora', to: '/bitacora' },
            { icon: 'bi-people', label: 'Usuarios', to: '/administracion/usuarios' },
          ]
        : []),
    ];
  });

  async logout() {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}

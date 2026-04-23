import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AppShell } from './core/layout/app-shell/app-shell';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth-module').then((module) => module.AuthModule),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./features/dashboard/dashboard-module').then((module) => module.DashboardModule),
      },
      {
        path: '',
        loadChildren: () => import('./features/inventory/inventory-module').then((module) => module.InventoryModule),
      },
      {
        path: '',
        loadChildren: () => import('./features/administration/administration-module').then((module) => module.AdministrationModule),
      },
      {
        path: '',
        loadChildren: () => import('./features/reports/reports-module').then((module) => module.ReportsModule),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

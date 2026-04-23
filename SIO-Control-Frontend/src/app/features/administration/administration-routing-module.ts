import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { AuditLogPage } from './pages/audit-log-page/audit-log-page';
import { UsersPage } from './pages/users-page/users-page';

const routes: Routes = [
  { path: 'administracion/usuarios', component: UsersPage, canActivate: [roleGuard] },
  { path: 'bitacora', component: AuditLogPage, canActivate: [roleGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdministrationRoutingModule {}

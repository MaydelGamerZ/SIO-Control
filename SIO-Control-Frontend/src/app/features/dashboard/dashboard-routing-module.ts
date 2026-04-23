import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { SupervisorPage } from './pages/supervisor-page/supervisor-page';

const routes: Routes = [
  { path: 'inicio', component: DashboardPage },
  { path: 'supervisor', component: SupervisorPage, canActivate: [roleGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { ReportsPage } from './pages/reports-page/reports-page';

const routes: Routes = [{ path: 'reportes', component: ReportsPage, canActivate: [roleGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}

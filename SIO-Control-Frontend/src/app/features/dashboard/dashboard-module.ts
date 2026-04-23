import { NgModule } from '@angular/core';
import { DashboardRoutingModule } from './dashboard-routing-module';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { SupervisorPage } from './pages/supervisor-page/supervisor-page';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [DashboardPage, SupervisorPage],
  imports: [SharedModule, DashboardRoutingModule],
})
export class DashboardModule {}

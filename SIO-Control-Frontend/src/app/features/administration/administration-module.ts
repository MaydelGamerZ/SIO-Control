import { NgModule } from '@angular/core';
import { AdministrationRoutingModule } from './administration-routing-module';
import { UsersPage } from './pages/users-page/users-page';
import { AuditLogPage } from './pages/audit-log-page/audit-log-page';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [UsersPage, AuditLogPage],
  imports: [SharedModule, AdministrationRoutingModule],
})
export class AdministrationModule {}

import { NgModule } from '@angular/core';
import { AuthRoutingModule } from './auth-routing-module';
import { LoginPage } from './pages/login-page/login-page';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [LoginPage],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}

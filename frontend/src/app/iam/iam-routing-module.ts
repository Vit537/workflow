import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GestionUsuariosComponent } from './user-management/gestion-usuarios.component';
import { AuthGuard } from '../shared/guards/auth.guard';
import { AdminGuard } from '../shared/guards/admin.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'usuarios',
    component: GestionUsuariosComponent,
    canActivate: [AuthGuard, AdminGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IamRoutingModule {}

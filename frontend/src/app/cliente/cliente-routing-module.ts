import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteGuard } from '../shared/guards/cliente.guard';
import { ClienteShellComponent } from './cliente-shell/cliente-shell.component';
import { ClienteLoginComponent } from './auth/cliente-login.component';
import { ClienteRegistroComponent } from './auth/cliente-registro.component';
import { ListaConsultasComponent } from './consultas/lista-consultas.component';
import { DetalleConsultaComponent } from './consultas/detalle-consulta.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';

const routes: Routes = [
  { path: 'login', component: ClienteLoginComponent },
  { path: 'registro', component: ClienteRegistroComponent },
  {
    path: '',
    component: ClienteShellComponent,
    canActivate: [ClienteGuard],
    children: [
      { path: 'consultas', component: ListaConsultasComponent },
      { path: 'consultas/:id', component: DetalleConsultaComponent },
      { path: 'notificaciones', component: NotificacionesComponent },
      { path: '', redirectTo: 'consultas', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClienteRoutingModule {}

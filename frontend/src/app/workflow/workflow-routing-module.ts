import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonitorActividadesComponent } from './activity-monitor/monitor-actividades.component';
import { BusquedaPoliticasComponent } from './policy-search/busqueda-politicas.component';
import { DetallePoliticaComponent } from './policy-detail/detalle-politica.component';
import { DetalleActividadComponent } from './activity-detail/detalle-actividad.component';
import { AuthGuard } from '../shared/guards/auth.guard';

const routes: Routes = [
  {
    path: 'monitor',
    component: MonitorActividadesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'politicas',
    component: BusquedaPoliticasComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'politicas/:id',
    component: DetallePoliticaComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'tramites/:tramiteId/pasos/:nodoId',
    component: DetalleActividadComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule {}

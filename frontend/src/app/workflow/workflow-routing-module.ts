import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonitorActividadesComponent } from './activity-monitor/monitor-actividades.component';
import { BusquedaPoliticasComponent } from './policy-search/busqueda-politicas.component';
import { DetallePoliticaComponent } from './policy-detail/detalle-politica.component';
import { DetalleActividadComponent } from './activity-detail/detalle-actividad.component';
import { KpiDashboardComponent } from './kpi-dashboard/kpi-dashboard.component';
import { ListaConsultasComponent } from './consultas/lista-consultas.component';
import { DetalleConsultaComponent } from './consultas/detalle-consulta.component';
import { ReporteDinamicoComponent } from './reportes/reporte-dinamico.component';
import { MonitorIaComponent } from './monitor-ia/monitor-ia.component';
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
  {
    path: 'kpis',
    component: KpiDashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'consultas',
    component: ListaConsultasComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'consultas/:id',
    component: DetalleConsultaComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'reportes',
    component: ReporteDinamicoComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'monitor-ia',
    component: MonitorIaComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonitorActividadesComponent } from './activity-monitor/monitor-actividades.component';
import { AuthGuard } from '../shared/guards/auth.guard';

const routes: Routes = [
  {
    path: 'monitor',
    component: MonitorActividadesComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule {}

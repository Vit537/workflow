import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import { WorkflowRoutingModule } from './workflow-routing-module';
import { MonitorActividadesComponent } from './activity-monitor/monitor-actividades.component';

@NgModule({
  declarations: [MonitorActividadesComponent],
  imports: [
    CommonModule,
    WorkflowRoutingModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatDividerModule,
  ],
})
export class WorkflowModule {}

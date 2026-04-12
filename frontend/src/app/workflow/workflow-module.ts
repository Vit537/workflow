import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { WorkflowRoutingModule } from './workflow-routing-module';
import { MonitorActividadesComponent } from './activity-monitor/monitor-actividades.component';
import { BusquedaPoliticasComponent } from './policy-search/busqueda-politicas.component';
import { DetallePoliticaComponent } from './policy-detail/detalle-politica.component';
import { DetalleActividadComponent } from './activity-detail/detalle-actividad.component';
import { NodosPorCarrilPipe } from '../shared/pipes/nodos-por-carril.pipe';

@NgModule({
  declarations: [
    MonitorActividadesComponent,
    BusquedaPoliticasComponent,
    DetallePoliticaComponent,
    DetalleActividadComponent,
    NodosPorCarrilPipe,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    WorkflowRoutingModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatDividerModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatRadioModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class WorkflowModule {}

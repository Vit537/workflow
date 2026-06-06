import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ClienteRoutingModule } from './cliente-routing-module';
import { ClienteShellComponent } from './cliente-shell/cliente-shell.component';
import { ClienteLoginComponent } from './auth/cliente-login.component';
import { ClienteRegistroComponent } from './auth/cliente-registro.component';
import { ListaConsultasComponent } from './consultas/lista-consultas.component';
import { DetalleConsultaComponent } from './consultas/detalle-consulta.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';

@NgModule({
  declarations: [
    ClienteShellComponent,
    ClienteLoginComponent,
    ClienteRegistroComponent,
    ListaConsultasComponent,
    DetalleConsultaComponent,
    NotificacionesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ClienteRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatCheckboxModule,
  ],
})
export class ClienteModule {}

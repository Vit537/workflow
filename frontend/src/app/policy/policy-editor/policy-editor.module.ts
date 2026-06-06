import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

import { PolicyEditorRoutingModule } from './policy-editor-routing-module';
import { EditorPoliticaComponent } from './editor-politica.component';
import { NodoPropiedadesComponent } from './nodo-propiedades/nodo-propiedades.component';
import { PanelPublicarComponent } from './panel-publicar/panel-publicar.component';
import { PanelIaComponent } from './panel-ia/panel-ia.component';
import { RepositorioDocumentalComponent } from './repositorio-documental/repositorio-documental.component';
import { EditorOnlyOfficeComponent } from './editor-onlyoffice/editor-onlyoffice.component';

@NgModule({
  declarations: [
    EditorPoliticaComponent,
    NodoPropiedadesComponent,
    PanelPublicarComponent,
    PanelIaComponent,
    RepositorioDocumentalComponent,
    EditorOnlyOfficeComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PolicyEditorRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatRadioModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDividerModule,
  ],
})
export class PolicyEditorModule {}

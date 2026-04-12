import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestionPoliticasComponent } from './policy-list/gestion-politicas.component';
import { EditorPoliticaComponent } from './policy-editor/editor-politica.component';

const routes: Routes = [
  { path: '', component: GestionPoliticasComponent },
  { path: 'editor/:id', component: EditorPoliticaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PolicyRoutingModule {}

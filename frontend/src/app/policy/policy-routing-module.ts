import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestionPoliticasComponent } from './policy-list/gestion-politicas.component';

const routes: Routes = [
  { path: '', component: GestionPoliticasComponent },
  {
    path: 'editor/:id',
    loadChildren: () =>
      import('./policy-editor/policy-editor.module').then((m) => m.PolicyEditorModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PolicyRoutingModule {}

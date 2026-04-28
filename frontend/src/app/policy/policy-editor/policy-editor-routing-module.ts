import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditorPoliticaComponent } from './editor-politica.component';

const routes: Routes = [{ path: '', component: EditorPoliticaComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PolicyEditorRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';
import { AdminGuard } from './shared/guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    loadChildren: () => import('./iam/iam-module').then(m => m.IamModule),
  },
  {
    path: 'policy',
    canActivate: [AuthGuard, AdminGuard],
    loadChildren: () => import('./policy/policy-module').then(m => m.PolicyModule),
  },
  {
    path: 'workflow',
    canActivate: [AuthGuard],
    loadChildren: () => import('./workflow/workflow-module').then(m => m.WorkflowModule),
  },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudentsPageComponent } from './components/students-page/students-page.component';
import { ManageAdminsComponent } from './components/manage-admins/manage-admins.component';
import { authGuard } from './guards/auth.guard';
import { principalGuard } from './guards/principal.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: StudentsPageComponent },
      { path: 'users', component: ManageAdminsComponent, canActivate: [principalGuard] },
    ],
  },
  { path: '**', redirectTo: '' },
];

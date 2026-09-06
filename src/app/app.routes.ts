import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(
        (component) => component.Login,
      ),
  },

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },

  {
    path: '',
    loadComponent: () =>
      import('./layouts/authenticated-layout/authenticated-layout').then(
        (component) => component.AuthenticatedLayout,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then(
            (component) => component.Dashboard,
          ),
      },

      {
        path: 'incidents',
        loadComponent: () =>
          import(
            './features/incidents/incidents/pages/incidents/incidents'
          ).then(
            (component) => component.Incidents,
          ),
      },

      {
        path: 'assignments',
        loadComponent: () =>
          import(
            './features/incidents/assignments/pages/assignments/assignments'
          ).then(
            (component) => component.Assignments,
          ),
      },

      {
        path: 'delivery',
        loadComponent: () =>
          import(
            './features/incidents/delivery/pages/delivery/delivery'
          ).then(
            (component) => component.Delivery,
          ),
      },

      {
        path: 'users',
        loadComponent: () =>
          import(
            './features/users/pages/users-list/users-list'
          ).then(
            (component) => component.UsersList,
          ),
      },

      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/pages/profile/profile').then(
            (component) => component.Profile,
          ),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
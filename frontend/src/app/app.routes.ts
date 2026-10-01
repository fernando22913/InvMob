import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

/**
 * Every page is a standalone component loaded lazily with `loadComponent`
 * (Angular Router requirement from the migration plan).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/products/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'sales',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/sales/sales.page').then((m) => m.SalesPage),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/inventory/inventory.page').then((m) => m.InventoryPage),
  },
  {
    path: 'purchases',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/purchases/purchases.page').then((m) => m.PurchasesPage),
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/customers/customers.page').then((m) => m.CustomersPage),
  },
  {
    path: 'suppliers',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/suppliers/suppliers.page').then((m) => m.SuppliersPage),
  },
  {
    path: 'warehouses',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/warehouses/warehouses.page').then((m) => m.WarehousesPage),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/categories/categories.page').then((m) => m.CategoriesPage),
  },
  {
    path: 'units',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/units/units.page').then((m) => m.UnitsPage),
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/users/users.page').then((m) => m.UsersPage),
  },
  {
    path: 'roles',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/roles/roles.page').then((m) => m.RolesPage),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

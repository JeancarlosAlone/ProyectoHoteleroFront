import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { HomeSectionComponent } from './home-section/home-section.component';
import { ServiciosAdicionalesComponent } from './servicios-adicionales/servicios-adicionales.component';  // Importa el componente de servicios adicionales

export const routes: Routes = [
  {
    path: 'reservar',
    loadComponent: () =>
      import('./reservar-habitacion/reservar-habitacion.component')
        .then(m => m.ReservarHabitacionComponent)
  },
  {
    path: 'reservar/:id',
    loadComponent: () =>
      import('./habitacion-detalle/habitacion-detalle.component')
        .then(m => m.HabitacionDetalleComponent)
  },

  {
    path: 'pago-reserva',
    loadComponent: () =>
      import('./pago-reserva/pago-reserva.component')
        .then(m => m.PagoReservaComponent)
  },

  {
    path: '',
    loadComponent: () => import('./login/login.component').then(c => c.LoginComponent),
    pathMatch: 'full',
  },
  {
    path: 'GuardarReporte',
    loadComponent: () => import('./reporte-diario/reporte-diario.component').then(c => c.ReporteDiarioComponent),
    pathMatch: 'full'
  },

  {
    path: 'SACH',
    loadComponent: () => import('./home-section/home-section.component').then(c => c.HomeSectionComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'users',
        loadComponent: () => import('./Users/usersList/usersList.component').then(c => c.UserHistoryComponent),
        data: { requiredRole: 'admin', title: 'Gestion de Usuarios' }
      },
      {
        path: 'habitaciones',
        loadComponent: () => import('./Habitaciones/rooms/rooms.component').then(c => c.RoomsComponent),
        data: { title: 'Habitaciones' }
      },
      {
        path: 'huesped',
        loadComponent: () => import('./Huesped/huesped/huesped.component').then(c => c.HuespedComponent),
        data: { title: 'Gestión de Huéspedes', requiredRole: ['admin', 'user'] }
      },
      {
        path: 'RegistroHuesped/:id',
        loadComponent: () => import('./reservacion/reservacion.component').then(c => c.ReservacionComponent),
        data: { title: 'Registro Huesped' }
      },
      {
        path: 'pago',
        loadComponent: () => import('./pago/pago.component').then(c => c.PagoComponent),
        data: { title: 'Pago con PayPal' }
      },
      // Ruta añadida para Servicios Adicionales
      {
        path: 'servicios-adicionales',
        component: ServiciosAdicionalesComponent,  // Aquí se carga el componente que muestra los servicios adicionales
        data: { title: 'Servicios Adicionales', requiredRole: 'admin' }  // Solo accesible para administradores
      }
    ]
  },

  {
    path: '**',
    redirectTo: ''
  }
];

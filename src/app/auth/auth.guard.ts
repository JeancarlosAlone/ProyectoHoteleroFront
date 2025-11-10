import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const token = localStorage.getItem('token');
  const storedId = localStorage.getItem('idUser');
  const storedRole = localStorage.getItem('rol');
  const requiredRole = route.data['requiredRole'];  // Extrae el rol requerido para la ruta

  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  // Verifica si la ruta es pública o si está permitida por la query "origen=cliente"
  const isPublic = !!route.data?.['public'];
  const path = route.routeConfig?.path || state.url || '';
  const origenClienteQuery = route.queryParams && route.queryParams['origen'] === 'cliente';
  // Permitir acceder a la página de pago si se llega desde la página de reservas
  const fromOlympusExternalReservar = typeof window !== 'undefined' && window.location.href.includes('olympusf.onrender.com/reservar');

  // Si es una página pública o proviene de un origen específico, permite el acceso
  if (isPublic || path === 'pago-reserva' || origenClienteQuery || (fromOlympusExternalReservar && state.url?.includes('pago-reserva'))) {
    return true;
  }

  // Verifica si el token existe
  if (!token) {
    // SnackBar o alerta si no está autenticado
    alert('error: Debes iniciar sesión para acceder a esta página.');
    router.navigate(['/reservar']);
    return false;
  }

  // Si la ruta requiere un rol específico, verifica si el rol del usuario coincide
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(storedRole)) {
      alert('Acceso denegado: Rol no autorizado');
      router.navigate(['/SACH/habitaciones']); // Redirige si el rol no es autorizado
      return false;
    }
  }

  // Si todo es correcto, permite la navegación
  return true;
};

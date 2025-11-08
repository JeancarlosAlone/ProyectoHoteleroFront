import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const token = localStorage.getItem('token');
  const storedId = localStorage.getItem('idUser');
  const storedRole = localStorage.getItem('rol');
  const requiredRole = route.data['requiredRole'];  // Extrae el rol requerido para la ruta

  const snackBar = inject(MatSnackBar);
  const router = inject(Router);

  // Verifica si el token existe
  if (!token) {
    alert('Gracias por preferirnos');
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

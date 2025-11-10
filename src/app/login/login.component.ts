import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../Users/Users.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  showPassword: boolean = false;
  loginErrorMessage: string = '';

  showRegisterModal: boolean = false;
  registerData = {
    name: '',
    apellido: '',
    correo: '',
    password: ''
  };

  constructor(private userService: UsersService, private router: Router, private http: HttpClient) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.loginErrorMessage = '';

    if (!this.username || !this.password) {
      this.loginErrorMessage = 'Por favor, revise o complete ambos campos.';
      return;
    }

    // ===== 1. Intentar login como usuario/admin =====
    this.userService.login(this.username, this.password).subscribe({
      next: (response) => {
        const id = response.idUser;
        if (id) localStorage.setItem('idUser', id.toString());
        if (response.token) localStorage.setItem('token', response.token);
        if (response.rol) localStorage.setItem('rol', response.rol);

        this.router.navigate(['/SACH/habitaciones']);
      },
      error: (err) => {
        console.error('[LoginComponent] auth login error:', err?.status, err?.error || err);
        // Intentamos luego el login como cliente
        this.tryClientLogin();
      },
    });
  }

  private tryClientLogin(): void {
  this.http.post(`${environment.apiUrl}/api/clientes/login`, {
      correo: this.username,  // Se está enviando el correo o nombre
      password: this.password
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('cliente', JSON.stringify(res.cliente));
        this.router.navigate(['/reservar']);
      },
      error: (err) => {
        console.error('[LoginComponent] clientes login error:', err?.status, err?.error || err);
        if (err.status === 0) {
          this.loginErrorMessage = 'No se logró establecer conexión con el servidor.';
        } else if (err.status === 404) {
          this.loginErrorMessage = 'Ruta de login de cliente no encontrada en el backend (404).';
        } else if (err.status === 500) {
          this.loginErrorMessage = 'Error interno en el servidor al intentar autenticar (500). Revisa logs del backend.';
        } else {
          this.loginErrorMessage = 'Credenciales incorrectas o usuario no encontrado. Valide que su nombre y contraseña sean correctos.';
        }
      }
    });
}


  openRegisterModal() {
    this.showRegisterModal = true;
    this.loginErrorMessage = '';
  }

  closeRegisterModal() {
    this.showRegisterModal = false;
    this.registerData = { name: '', apellido: '', correo: '', password: '' };
  }

  onRegister() {
    if (!this.registerData.name || !this.registerData.apellido || !this.registerData.correo || !this.registerData.password) {
      this.loginErrorMessage = 'Por favor complete todos los campos.';
      return;
    }

  this.http.post(`${environment.apiUrl}/api/clientes/register`, this.registerData).subscribe({
      next: () => {
        alert('Cliente registrado correctamente.');
        this.closeRegisterModal();
      },
      error: (err) => {
        console.error(err);
        this.loginErrorMessage = 'Error al registrar usuario.';
      }
    });
  }
}

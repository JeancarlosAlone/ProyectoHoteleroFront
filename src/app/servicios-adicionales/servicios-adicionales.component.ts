import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Importar HttpClient
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
}

@Component({
  selector: 'app-servicios-adicionales',
  templateUrl: './servicios-adicionales.component.html',
  styleUrls: ['./servicios-adicionales.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ServiciosAdicionalesComponent implements OnInit {
  servicios: Servicio[] = JSON.parse(localStorage.getItem('servicios') || '[]');
  servicioSeleccionado: Servicio = {
    id: 0,
    nombre: '',
    descripcion: '',
    precio: 0,
    imagen: ''
  };
  modalVisible = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.servicios.length === 0) {
      this.servicios = [
        // Servicios predeterminados
      ];
    }
  }

  abrirModal(servicio: Servicio): void {
    this.servicioSeleccionado = { ...servicio };
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  // Manejo de la carga de la imagen
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('imagen', file, file.name);

      this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/upload`, formData).subscribe(response => {
        // Actualizamos la URL de la imagen en el servicio
        this.servicioSeleccionado.imagen = response.imageUrl;
      });
    }
  }

  guardarCambios(): void {
    if (this.servicioSeleccionado) {
      const index = this.servicios.findIndex(servicio => servicio.id === this.servicioSeleccionado.id);
      if (index !== -1) {
        this.servicios[index] = { ...this.servicioSeleccionado };
      } else {
        this.servicios.push({ ...this.servicioSeleccionado });
      }

      localStorage.setItem('servicios', JSON.stringify(this.servicios));
      this.cerrarModal();
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { HuespedService } from '../huesped.service';
import { HuespedResponse } from '../huesped.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-huesped',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './huesped.component.html',
  styleUrls: ['./huesped.component.css']
})
export class HuespedComponent implements OnInit {

  huespedes: HuespedResponse[] = [];
  huespedesFiltrados: HuespedResponse[] = [];
  activeTab: 'todos' | 'manual' | 'enLinea' = 'todos';
  filtroGeneral: string = '';
  filtroFecha: string = '';

  constructor(private huespedService: HuespedService) {}

  ngOnInit(): void {
    this.cargarHuespedes();
  }

  cargarHuespedes(): void {
    this.huespedService.getHuespedes().subscribe({
      next: (data) => {
        this.huespedes = data;
        this.aplicarFiltros();
      },
      error: (err) => console.error('Error al cargar huéspedes:', err)
    });
  }

  aplicarFiltros(): void {
    let filtrados = [...this.huespedes];

    if (this.activeTab !== 'todos') {
      filtrados = filtrados.filter(h => h.tipoRegistro === this.activeTab);
    }

    if (this.filtroGeneral.trim() !== '') {
      const texto = this.filtroGeneral.toLowerCase();
      filtrados = filtrados.filter(h =>
        h.nameHuesped.toLowerCase().includes(texto) ||
        h.apellidoHuesped.toLowerCase().includes(texto) ||
        (h.telefono?.toLowerCase().includes(texto) ?? false)
      );
    }

    if (this.filtroFecha) {
      const fechaSeleccionada = new Date(this.filtroFecha).toDateString();
      filtrados = filtrados.filter(h => {
        const fechaReg = new Date(h.fechaRegistro || '').toDateString();
        return fechaReg === fechaSeleccionada;
      });
    }

    this.huespedesFiltrados = filtrados;
  }

  setActive(tab: 'todos' | 'manual' | 'enLinea'): void {
    this.activeTab = tab;
    this.aplicarFiltros();
  }

  terminarEstadia(huesped: HuespedResponse, event: any): void {
    const isChecked = event.target.checked;

    if (isChecked && huesped.statusHuesped === 'pagado') {
      const idRoom = huesped.habitacionAsignada?.id_Rooms || (huesped as any).id_Rooms;

      if (!idRoom) {
        alert('No se encontró la habitación asociada a este huésped.');
        event.target.checked = false;
        return;
      }

      this.huespedService.actualizarEstadoHabitacion(idRoom, 'libre').subscribe({
        next: (res) => {
          console.log('Estado actualizado:', res);
          alert('Habitación marcada como libre.');

          if (huesped.habitacionAsignada) {
            huesped.habitacionAsignada.estado = 'libre';
          }
        },
        error: (err) => {
          console.error('Error al actualizar la habitación:', err);
          alert('Error al actualizar la habitación.');
          event.target.checked = false;
        }
      });
    } else {
      event.target.checked = false;
      alert('Solo se puede finalizar una estadía con estado "Pagado".');
    }
  }
}

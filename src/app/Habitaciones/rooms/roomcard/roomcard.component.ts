import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Room, TypesRooms, TypesRoomsStatus } from '../../rooms.model';

@Component({
  selector: 'app-roomcard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roomcard.component.html',
  styleUrls: ['./roomcard.component.css'],
})
export class RoomcardComponent {
  @Input() room!: Room;
  @Input() admin: boolean = false;

  @Output() editarHabitacion = new EventEmitter<Room>();
  @Output() eliminarHabitacion = new EventEmitter<number>();

  constructor(private router: Router) {}

  /** Redirección al detalle */
  verHabitacion(id: number): void {
    this.router.navigate(['/SACH/RegistroHuesped', id]);
  }

  /** Clase visual del estado */
  getEstadoClass(estado: TypesRoomsStatus): string {
    return `estado-${estado}`;
  }

  /** Traducción del tipo */
  getTipoHabitacion(tipo: TypesRooms): string {
    switch (tipo) {
      case 'normal':
        return 'Habitación Normal';
      case 'doble':
        return 'Habitación Doble';
      case 'plus':
        return 'Habitación Plus';
      default:
        return tipo;
    }
  }

  /** Emitir evento para editar */
  editarRoom(room: Room): void {
    this.editarHabitacion.emit(room);
  }

  /** Emitir evento para eliminar */
  eliminarRoom(id: number): void {
    if (confirm('¿Seguro que deseas eliminar esta habitación?')) {
      this.eliminarHabitacion.emit(id);
    }
  }
}

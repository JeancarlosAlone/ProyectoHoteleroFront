import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RoomsService } from '../Habitaciones/rooms.service';
import { Room } from '../Habitaciones/rooms.model';


@Component({
  selector: 'app-reservar-habitacion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reservar-habitacion.component.html',
  styleUrls: ['./reservar-habitacion.component.css']
})
export class ReservarHabitacionComponent implements OnInit {

  rooms: Room[] = [];
  isLoading: boolean = false;
  customMessage: string = '';

  constructor(private roomsService: RoomsService) {}

  ngOnInit(): void {
    this.cargarTodas();
  }

  // ✅ Cargar todas las habitaciones
  cargarTodas() {
    this.isLoading = true;
    this.roomsService.getAllRooms().subscribe({
      next: (data) => {
        this.rooms = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al cargar habitaciones:', err);
      }
    });
  }

  // ✅ Filtrar por nivel
  filtrarPorNivel(nivel: string) {
    this.isLoading = true;
    this.roomsService.getAllRooms().subscribe({
      next: (data) => {
        this.rooms = data.filter(room => room.nivel === nivel);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al filtrar habitaciones:', err);
      }
    });
  }
}

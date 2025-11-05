import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
  isLoading = false;
  customMessage = '';

  private router = inject(Router); 

  constructor(private roomsService: RoomsService) {}

  ngOnInit(): void {
    this.cargarTodas();
  }

  cargarTodas(): void {
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

  filtrarPorNivel(nivel: string): void {
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

  cerrarSesion(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']); 
  }
}

import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { HuespedService } from '../Huesped/huesped.service'; 
import { HuespedResponse } from '../Huesped/huesped.model'; 
import { MatTableModule } from '@angular/material/table'; 
import { RoomsService } from '../Habitaciones/rooms.service'; 
import { Room } from '../Habitaciones/rooms.model'; 
import { RouterModule } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 
import { MatNativeDateModule } from '@angular/material/core'; 
import { MatDatepickerModule } from '@angular/material/datepicker'; 
import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatInputModule } from '@angular/material/input'; 

@Component({
  selector: 'app-reporte-diario',
  imports: [CommonModule, MatTableModule, RouterModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './reporte-diario.component.html',
  styleUrls: ['./reporte-diario.component.css']
})
export class ReporteDiarioComponent implements OnInit {
  
  dia: string = '';
  Fecha: Date = new Date();
  
  rooms: Room[] = [];
  huespedes: HuespedResponse[] = [];

  roomsNivel1: Room[] = [];
  roomsNivel2: Room[] = [];

  constructor(
    private huespedService: HuespedService,
    private roomService: RoomsService
  ) {
    this.actualizarDia();
  }

  ngOnInit(): void {
    this.cargarRooms();
    this.cargarHuespedes();
  }

  private cargarRooms(): void {
    this.roomService.loadRooms();
    this.roomService.getRooms().subscribe((roomList) => {
      this.rooms = roomList;
      this.separarPorNivel(roomList);
    });
  }

  private cargarHuespedes(): void {
    this.huespedService.getHuespedes().subscribe((huespedes) => {
  this.huespedes = huespedes; // ✅ ahora incluye todos, incluso cancelados
});

  }

  private separarPorNivel(roomList: Room[]): void {
    this.roomsNivel1 = roomList.filter((room) => room.nivel === 'N1');
    this.roomsNivel2 = roomList.filter((room) => room.nivel === 'N2');
  }

  actualizarDia() {
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado'];
    this.dia = diasSemana[this.Fecha.getDay()];
  }

  setFecha(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value;
    if (valor) {
      const nuevaFecha = new Date(valor);
      this.Fecha = nuevaFecha;
      this.actualizarDia();
    }
  }

  onFechaChange(event: any) {
    const nuevaFecha: Date = event.value || event.target?.value;
    if (nuevaFecha) {
      this.Fecha = new Date(nuevaFecha);
      this.actualizarDia();
    }
  }

  getHuespedPorHabitacion(idRoom: number): HuespedResponse | null {
    const huesped = this.huespedes.find(h => {
      const fechaRegistro = h.fechaRegistro ? new Date(h.fechaRegistro) : null;
      if (!fechaRegistro) return false;

      return (
        h.habitacionAsignada?.id_Rooms === idRoom && 
        fechaRegistro.toDateString() === this.Fecha.toDateString()
      );
    });
    return huesped || null;
  }

  imprimir() {
    window.print();
  }
}

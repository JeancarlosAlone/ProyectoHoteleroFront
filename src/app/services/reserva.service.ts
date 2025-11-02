import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private reservaData: any = null;

  // Guarda la información de la reserva (cliente, habitación, servicios, total)
  setReserva(data: any) {
    this.reservaData = data;
    localStorage.setItem('reservaData', JSON.stringify(data));
  }

  // Recupera los datos (desde memoria o localStorage)
  getReserva() {
    if (!this.reservaData) {
      const stored = localStorage.getItem('reservaData');
      this.reservaData = stored ? JSON.parse(stored) : null;
    }
    return this.reservaData;
  }

  // Limpia los datos (después del pago o cancelación)
  clearReserva() {
    this.reservaData = null;
    localStorage.removeItem('reservaData');
  }
}

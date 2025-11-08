import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ReservaService } from '../services/reserva.service';
import { HuespedService } from '../Huesped/huesped.service';
import { RoomsService } from '../Habitaciones/rooms.service';
import { TypesRoomsStatus } from '../Habitaciones/rooms.model';
import { environment } from '../../environments/environment';

declare global {
  interface Window { paypal: any; }
}

@Component({
  selector: 'app-pago-reserva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-reserva.component.html',
  styleUrls: ['./pago-reserva.component.css']
})
export class PagoReservaComponent implements OnInit, AfterViewInit {
  origen: 'cliente' | 'usuario' = 'cliente';
  habitacion: any = null;
  cliente: any = null;
  serviciosSeleccionados: any[] = [];
  total = 0;
  totalqutzales = 0;
  mensaje = '';
  mostrarModal = false;
  mensajeModal = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private reservaService: ReservaService,
    private huespedService: HuespedService,
    private roomsService: RoomsService,
    private ngZone: NgZone
  ) {}

  private isUserContext(): boolean {
    const path = window.location.pathname;
    const esRutaUsuario = path.startsWith('/SACH/') || document.referrer.includes('/SACH/');
    const tieneIdUser = !!localStorage.getItem('idUser');
    return esRutaUsuario && tieneIdUser;
  }

  private navigateHard(target: string) {
    this.ngZone.run(() => {
      this.router.navigateByUrl(target).catch(() => window.location.assign(target));
    });
    setTimeout(() => {
      if (window.location.pathname !== target) window.location.assign(target);
    }, 400);
  }

  private async registrarYRedirigir(esUsuario: boolean) {
    const reserva = this.reservaService.getReserva();
    if (!reserva || !reserva.habitacion || !reserva.cliente) {
      this.navigateHard(esUsuario ? '/SACH/habitaciones' : '/reservar');
      return;
    }

    const idUser = localStorage.getItem('idUser');
    const req: any = {
      nameHuesped: reserva.cliente.nombre,
      apellidoHuesped: reserva.cliente.apellido,
      telefono: reserva.cliente.telefono,
      numPersonas: reserva.cliente.numPersonas,
      monto: reserva.total,
      statusHuesped: 'pagado',
      fechaRegistro: reserva.cliente.fechaInicio,
      fechaSalida: reserva.cliente.fechaFin,
      tipoRegistro: esUsuario ? 'manual' : 'enLinea',
      habitacionAsignada: { id_Rooms: reserva.habitacion.id_Rooms },

      serviciosSeleccionados: reserva.serviciosSeleccionados || []
    };

    if (esUsuario && idUser) req.usuarioRegistrador = { id_users: String(idUser) };

    try {
      await firstValueFrom(this.huespedService.createHuesped(req));

      try {
        await firstValueFrom(
          this.roomsService.changeStatus(
            reserva.habitacion.id_Rooms,
            TypesRoomsStatus.ocupada
          )
        );
      } catch {
        console.warn('⚠ No se pudo actualizar el estado, pero se registró el huésped.');
      }

      this.mostrarModalConMensaje('✅ Reserva registrada con éxito.');

      setTimeout(() => {
        this.reservaService.clearReserva();
        this.navigateHard(esUsuario ? '/SACH/habitaciones' : '/reservar');
      }, 3500);
    } catch (err) {
      console.error('Error al registrar huésped:', err);
      this.mostrarModalConMensaje('Ocurrió un error al registrar la reserva.');
      setTimeout(() => {
        this.navigateHard(esUsuario ? '/SACH/habitaciones' : '/reservar');
      }, 3500);
    }
  }

  ngOnInit(): void {
    const data = this.reservaService.getReserva();
    this.route.queryParams.subscribe(params => {
      // this.origen = params['origen'] === 'usuario' ? 'usuario' : 'cliente';
      console.log('Origen de la reserva:', this.origen);
    });

    if (!data) {
      alert('No hay datos de reserva disponibles.');
      this.router.navigate(['/habitaciones']);
      return;
    }

    this.habitacion = data.habitacion;
    this.cliente = data.cliente;
    this.serviciosSeleccionados = data.serviciosSeleccionados || [];

    const fechaInicio = new Date(this.cliente.fechaInicio);
    const fechaFin = new Date(this.cliente.fechaFin);
    const noches = Math.max(1, Math.ceil((+fechaFin - +fechaInicio) / (1000 * 60 * 60 * 24)));

    const precioBase = Number(this.habitacion?.precio) || 0;

    const totalServicios = this.serviciosSeleccionados.reduce(
      (acc: number, s: any) => acc + Number(s.precioFinal || s.precio || 0),
      0
    );

    this.total = (((precioBase * noches) + totalServicios)/7.74).toFixed(2) as unknown as number;
    this.totalqutzales = ((precioBase * noches) + totalServicios).toFixed(2) as unknown as number;  
    console.log('Noches:', noches);
    console.log('Precio base habitación:', precioBase);
    console.log('Total servicios adicionales:', totalServicios);
    console.log('Total general:', this.total);

    this.mensaje = '';
  }

  ngAfterViewInit(): void {
    this.intentarRenderizarBoton();
  }

  private mostrarModalConMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;
    setTimeout(() => (this.mostrarModal = false), 1200);
  }

  private intentarRenderizarBoton() {
    const intentar = () => {
      if ((window as any).paypal) {
        this.renderizarBotonPaypal();
      } else {
        setTimeout(intentar, 300);
      }
    };
    intentar();
  }

  private renderizarBotonPaypal() {
    const paypal = (window as any).paypal;
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

      createOrder: async () => {
        if (this.total <= 0) {
          this.mensaje = 'Monto inválido';
          return Promise.reject('Monto inválido');
        }

  const res = await fetch(`${environment.apiUrl}/api/pagos/crear-orden`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ total: Number(this.calcularTotalGeneralUSD()), currency: 'USD' })
        });

        const data = await res.json();
        return data?.data?.id;
      },

      onApprove: async (data: any) => {
        try {
          this.mensaje = 'Procesando pago...';

          const cap = await fetch(`${environment.apiUrl}/api/pagos/capturar-orden`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID })
          });
          const capJson = await cap.json();
          if (!capJson) throw new Error('No se pudo capturar la orden');

          // Generar factura
          try {
            const fac = await fetch(`${environment.apiUrl}/api/facturas/generar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cliente: this.cliente,
                habitacion: this.habitacion,
                serviciosSeleccionados: this.serviciosSeleccionados,
                total: this.total
              })
            });
            const facJson = await fac.json();
            this.mostrarModalConMensaje(
              facJson?.ok
                ? `Factura enviada al correo ${this.cliente?.email || ''}`
                : 'Pago realizado, pero hubo un problema al generar/enviar la factura.'
            );
          } catch {
            this.mostrarModalConMensaje(
              'Pago realizado, pero hubo un problema al generar/enviar la factura.'
            );
          }

          const esUsuario = this.isUserContext();
          this.registrarYRedirigir(esUsuario);
        } catch (err) {
          console.error(err);
          this.mensaje = 'Error en PayPal';
          const esUsuario = this.isUserContext();
          this.navigateHard(esUsuario ? '/SACH/habitaciones' : '/reservar');
        }
      },

      onError: (err: any) => {
        console.error(err);
        this.mensaje = 'Error en PayPal';
      }
    }).render('#paypal-button-container');
  }

  regresar() {
    // Guardar los datos del cliente en el localStorage para preservarlos
    localStorage.setItem('cliente', JSON.stringify(this.cliente));
    const localrol = localStorage.getItem('rol');

    
    if (localrol === 'admin' || localrol === 'user') {
      // Usar el id de la habitación para la navegación
      const idHabitacion = localStorage.getItem('idRoomReservacion');
      if (idHabitacion) {
        this.router.navigate([`/SACH/RegistroHuesped/${idHabitacion}`]);
        localStorage.removeItem('idRoomReservacion');
      }
    }
    else if(localrol==='cliente'){
       const idHabitacion = localStorage.getItem('idRoomReservacion');
      if (idHabitacion) {
        this.router.navigate([`reservar/${idHabitacion}`]);
        localStorage.removeItem('idRoomReservacion');
      }
    }

  }

  precioPaypal(preciohabitacion: any) {
      // Actualiza precioFinal de los servicios y calcula el total
      let totalServicios = 0;
      this.serviciosSeleccionados.forEach(servicio => {
      
        if (servicio.seleccionado) {
          totalServicios += Number((servicio.precioFinal||servicio.precio||0 ));
        }
      });
      const precioHabitacionUSD = Number((preciohabitacion ));
      const { fechaInicio, fechaFin } = this.cliente;
      const inicio = new Date(fechaInicio);
      let noches = 1;
        const fin = new Date(fechaFin);
        const diffMs = fin.getTime() - inicio.getTime();
        noches = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
       
      return ((precioHabitacionUSD* noches + totalServicios)/7.74).toFixed(2);  ;
    }

      calcularTotalServicios(): number {
  return this.serviciosSeleccionados.reduce((acc, s) => acc + (s.precioFinal || s.precio || 0), 0);
}

calcularTotalUSD(): string {
  const totalQ = this.calcularTotalServicios();
  return (totalQ / 7.74).toFixed(2);
}

calcularTotalGeneralUSD(): string {
  const totalHabitacion = Number(this.precioPaypal(this.habitacion?.precio)) || 0;
  const totalServicios = Number(this.calcularTotalUSD()) || 0;

  const total = totalHabitacion + totalServicios;
  return total.toFixed(2);
}

calcularTotalQuetzales(): number {
  const precioHabitacion = this.habitacion?.precio || 0;
  const totalServicios = this.calcularTotalServicios();
 const total = ((precioHabitacion * 7.74) + totalServicios).toFixed(2);
  return parseFloat (total);
}


}

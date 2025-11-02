import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReservaService } from '../services/reserva.service';

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
  habitacion: any = null;
  cliente: any = null;
  serviciosSeleccionados: any[] = [];
  total = 0;
  mensaje = '';
  mostrarModal = false;
  mensajeModal = '';

  // NUEVO MÉTODO
  mostrarModalConMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;

    setTimeout(() => {
      this.mostrarModal = false;
      this.router.navigate(['/reservar']);
    }, 3000);
  }

  constructor(private router: Router, private reservaService: ReservaService) { }

  ngOnInit(): void {
    const data = this.reservaService.getReserva();

    if (!data) {
      alert('No hay datos de reserva disponibles.');
      this.router.navigate(['/habitaciones']);
      return;
    }

    this.habitacion = data.habitacion;
    this.cliente = data.cliente;
    this.serviciosSeleccionados = data.serviciosSeleccionados || [];
    this.total = data.total || 0;

    console.log('Datos cargados desde ReservaService:', data);
  }

  ngAfterViewInit(): void {
    this.intentarRenderizarBoton();
  }

  calcularTotal() {
    const precioBase = Number(this.habitacion?.precio) || 0;
    const extras = this.serviciosSeleccionados.reduce(
      (acc, s) => acc + (s.precioFinal || s.precio || 0),
      0
    );
    this.total = precioBase + extras;
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

        const res = await fetch('http://localhost:8080/api/pagos/crear-orden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total: this.total })
        });

        const data = await res.json();
        return data?.data?.id;
      },

      onApprove: async (data: any) => {
        this.mensaje = 'Procesando pago...';

        const res = await fetch('http://localhost:8080/api/pagos/capturar-orden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderID })
        });
        const result = await res.json();

        if (result) {
          // Generar factura y enviarla por correo
          const facturaRes = await fetch('http://localhost:8080/api/facturas/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cliente: this.cliente,
              habitacion: this.habitacion,
              serviciosSeleccionados: this.serviciosSeleccionados,
              total: this.total,
            })
          });

          const facturaData = await facturaRes.json();

          if (facturaData.ok) {
            this.mostrarModalConMensaje(`✅ Factura enviada al correo ${this.cliente.email}`);
          } else {
            this.mostrarModalConMensaje('⚠️ Pago realizado, pero hubo un problema al generar o enviar la factura.');
          }

          this.reservaService.clearReserva();
        }
      },

      onError: (err: any) => {
        console.error(err);
        this.mensaje = 'Error en PayPal';
      }
    }).render('#paypal-button-container');
  }
}

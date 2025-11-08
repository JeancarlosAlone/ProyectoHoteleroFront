import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { ReservaService } from '../services/reserva.service';

declare global {
  interface Window { paypal: any; }
}

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago.component.html',
  styleUrls: ['./pago.component.css']
})
export class PagoComponent implements OnInit, AfterViewInit {
  cliente: any = null;
  habitacion: any = null;
  serviciosSeleccionados: any[] = [];
  total = 0;
  totalUsd: any = 0;
  mensaje = '';
  mostrarModal = false;
  mensajeModal = '';
  emailCliente: string = '';
  precioTotalUsd: number = 0;
  clientesEncontrados: any[] = [];
  clienteIdentifier: string = '';
  correoValido: boolean = false;
  totalqutzales: number = 0;

  constructor(
    private ngZone: NgZone,
    private router: Router, 
    private reservaService: ReservaService
  ) {}

ngOnInit(): void {
  const data = this.reservaService.getReserva();

  if (!data || !data.habitacion || !data.serviciosSeleccionados || !data.cliente) {
    console.error("No se encontró el precio de la habitación o servicios seleccionados");
    this.mensaje = "Error al cargar la información de la habitación o los servicios.";
    return;
  }

  this.habitacion = data.habitacion;
  this.cliente = data.cliente;
  this.serviciosSeleccionados = data.serviciosSeleccionados || [];

  // Asegúrate de que las fechas están presentes
  const { fechaInicio, fechaFin } = this.cliente;
  console.log('Fechas de la reserva:', fechaInicio, fechaFin);

  if (!fechaInicio || !fechaFin) {
    console.error('Fechas de reserva no válidas:', fechaInicio, fechaFin);
    this.mensaje = 'Fechas de reserva no válidas';
    return;
  }

  // El cálculo del precio total
  const precioBase = Number(this.habitacion?.precio) || 0;
  const totalServicios = this.serviciosSeleccionados.reduce(
    (acc: number, s: any) => acc + (Number(s.precioFinal || s.precio) || 0),
    0
  );

  this.total = ((precioBase * 1) + totalServicios);
  const tipoCambio = 7.74;
  this.totalqutzales = this.total;  // Total en quetzales
  this.totalUsd = (this.total / tipoCambio).toFixed(2); // Total en USD
  console.log('Precio Total en Quetzales:', this.totalqutzales);
  console.log('Total en USD:', this.totalUsd);
}

  ngAfterViewInit(): void {
    this.intentarRenderizarBoton();  // Llamada a la función de renderizado de PayPal
  }

  verificarCorreo() {
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.correoValido = patronCorreo.test(this.emailCliente.trim());
    if (this.correoValido) {
      setTimeout(() => this.renderizarBotonPaypal(), 300);
    }
  }

  private intentarRenderizarBoton() {
    const intentar = () => {
      if (document.getElementById('paypal-button-container')) {
        this.renderizarBotonPaypal();
      } else {
        setTimeout(intentar, 300);  // Intentar nuevamente cada 300ms
      }
    };
    intentar();
  }

  private renderizarBotonPaypal() {
    const paypal = (window as any).paypal;
    if (!paypal) return;

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: async () => {
        if (this.totalUsd <= 0 || !this.emailCliente.trim()) {
          this.mensaje = 'Debe ingresar un correo válido antes de pagar.';
          return Promise.reject('Correo requerido o monto inválido');
        }

        const res = await fetch(`${environment.apiUrl}/api/pagos/crear-orden`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total: this.totalUsd, currency: 'USD' })
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
            body: JSON.stringify({ orderId: data.orderID, idHuesped: this.cliente.idHuesped })
          });

          const capJson = await cap.json();
          if (!capJson) throw new Error('No se pudo capturar la orden');

          const fac = await fetch(`${environment.apiUrl}/api/facturas/generar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cliente: { nombre: this.cliente.nameHuesped, apellido: this.cliente.apellidoHuesped, telefono: this.cliente.telefono, email: this.emailCliente.trim() },
              habitacion: this.habitacion,
              serviciosSeleccionados: this.serviciosSeleccionados,
              total: this.total,
              pago: 'PayPal'
            })
          });

          const facJson = await fac.json();
          this.mostrarModalConMensaje(facJson?.ok
            ? `✅ Factura enviada al correo ${this.emailCliente.trim()}`
            : 'Pago realizado, pero hubo un problema al generar/enviar la factura.');

          setTimeout(() => {
            this.ngZone.run(() => {
              window.location.href = '/SACH/habitaciones';
            });
          }, 3500);
        } catch (err) {
          console.error(err);
          this.mensaje = 'Error en PayPal';
          this.ngZone.run(() => {
            window.location.href = '/SACH/habitaciones';
          });
        }
      },
      onError: (err: any) => {
        console.error(err);
        this.mensaje = 'Error en PayPal';
      }
    }).render('#paypal-button-container');
  }

  // Función para buscar clientes
  async buscarCliente() {
    try {
      const texto = this.clienteIdentifier.trim().toLowerCase();
      if (!texto) {
        this.cliente = null;
        this.mensaje = 'Ingrese un nombre, apellido o ID de habitación.';
        this.clientesEncontrados = [];
        return;
      }

      const url = `${environment.apiUrl}/api/huespedes/pendientes`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data || data.length === 0) {
        this.mensaje = 'No se encontraron clientes pendientes.';
        this.clientesEncontrados = [];
        return;
      }

      const filtrados = data.filter((c: any) => {
        const nombre = c.nameHuesped?.toLowerCase() || '';
        const apellido = c.apellidoHuesped?.toLowerCase() || '';
        const idHabitacion = c.habitacionAsignada?.id_Rooms?.toString() || '';
        return nombre.includes(texto) || apellido.includes(texto) || idHabitacion.includes(texto);
      });

      if (filtrados.length === 0) {
        this.mensaje = 'No se encontraron coincidencias con su búsqueda.';
        this.clientesEncontrados = [];
        return;
      }

      if (filtrados.length > 1) {
        this.clientesEncontrados = filtrados;
        this.mensaje = '';
      } else {
        this.seleccionarCliente(filtrados[0]);
      }
    } catch (err) {
      console.error('Error al buscar cliente pendiente:', err);
      this.mensaje = 'Ocurrió un error al buscar el cliente.';
    }
  }

  seleccionarCliente(huesped: any) {
    this.clientesEncontrados = [];
    this.cargarDatosHuesped(huesped);
  }

  private cargarDatosHuesped(huesped: any) {
    this.cliente = huesped;
    this.habitacion = huesped.habitacionAsignada;
    this.serviciosSeleccionados = huesped.servicios || [];

    const fechaInicio = new Date(huesped.fechaRegistro);
    const fechaFin = new Date(huesped.fechaSalida);
    const noches = Math.max(1, Math.ceil((+fechaFin - +fechaInicio) / (1000 * 60 * 60 * 24)));

    this.total = (this.habitacion.precio * noches) + this.serviciosSeleccionados.reduce(
      (acc: number, s: any) => acc + Number(s.precioFinal || s.precio || 0), 0
    );

    const tipoCambio = 7.75;
    this.precioTotalUsd = this.total / tipoCambio;
  }

  limpiarBusqueda(): void {
    this.clienteIdentifier = '';
    this.clientesEncontrados = [];
    this.cliente = null;
    this.mensaje = 'Ingrese un nombre, apellido o ID de habitación.';
  }

  mostrarModalConMensaje(mensaje: string): void {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;
    setTimeout(() => {
      this.mostrarModal = false;
    }, 3000);  // El modal se ocultará después de 3 segundos
  }

precioPaypal(precioHabitacion: any): string {
  const precio = Number(precioHabitacion);
  if (isNaN(precio)) {
    console.error('Precio de habitación no válido:', precioHabitacion);
    return '0.00';
  }

  const { fechaInicio, fechaFin } = this.cliente;

  if (!fechaInicio || !fechaFin) {
    console.error('Fechas de reserva no válidas:', fechaInicio, fechaFin);
    return '0.00';
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  const diffMs = fin.getTime() - inicio.getTime();
  const noches = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const precioTotal = (precio * noches) / 7.74;
  return precioTotal.toFixed(2);
}

}

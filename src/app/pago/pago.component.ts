import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

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
  // ===================== VARIABLES =====================
  cliente: any = null;
  habitacion: any = null;
  serviciosSeleccionados: any[] = [];
  total = 0;
  mensaje = '';
  mostrarModal = false;
  mensajeModal = '';
  emailCliente: string = '';
  precioTotalUsd: number = 0;
totalServiciosUsd: number = 0;
totalUsd: number = 0;

  nitFactura: string = '';
  moneda: string = 'USD';
  noches: number = 0;
  precioPorNoche: number = 0;

  clienteIdentifier: string = '';
  correoValido: boolean = false;

  clientesEncontrados: any[] = [];

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.intentarRenderizarBoton();
  }

  // ===================== BUSCAR HUÉSPED =====================
  async buscarCliente() {
    try {
      const texto = this.clienteIdentifier.trim().toLowerCase();
      if (!texto) {
        this.cliente = null;
        this.habitacion = null;
        this.serviciosSeleccionados = [];
        this.total = 0;
        this.mensaje = 'Ingrese un nombre, apellido o ID de habitación.';
        this.clientesEncontrados = [];
        return;
      }

  // 🔹 Obtener todos los huéspedes pendientes
  const url = `${environment.apiUrl}/api/huespedes/pendientes`;
  const res = await fetch(url);
      const data = await res.json();

      if (!data || data.length === 0) {
        this.mensaje = 'No se encontraron huéspedes pendientes.';
        this.clientesEncontrados = [];
        this.cliente = null;
        return;
      }

      // 🔹 Filtrar manualmente desde el front
      const filtrados = data.filter((c: any) => {
        const nombre = c.nameHuesped?.toLowerCase() || '';
        const apellido = c.apellidoHuesped?.toLowerCase() || '';
        const idHabitacion = c.habitacionAsignada?.id_Rooms?.toString() || '';
        return (
          nombre.includes(texto) ||
          apellido.includes(texto) ||
          idHabitacion.includes(texto)
        );
      });

      if (filtrados.length === 0) {
        this.mensaje = 'No se encontraron coincidencias con su búsqueda.';
        this.clientesEncontrados = [];
        this.cliente = null;
        return;
      }

      // 🔹 Mostrar lista si hay más de uno
      if (filtrados.length > 1) {
        this.clientesEncontrados = filtrados;
        this.mensaje = '';
        return;
      }

      // 🔹 Cargar directamente si solo hay un resultado
      this.cargarDatosHuesped(filtrados[0]);
    } catch (err) {
      console.error('Error al buscar cliente pendiente:', err);
      this.mensaje = 'Ocurrió un error al buscar el cliente.';
    }
  }

  mostrarListaClientes(lista: any[]) {
    this.clientesEncontrados = lista;
    this.mensaje = '';
  }

  seleccionarCliente(huesped: any) {
    this.clientesEncontrados = [];
    this.cargarDatosHuesped(huesped);
    this.clienteIdentifier = `${huesped.nameHuesped} ${huesped.apellidoHuesped}`;
  }

 private cargarDatosHuesped(huesped: any) {
  this.cliente = huesped;
  this.habitacion = huesped.habitacionAsignada;
  this.serviciosSeleccionados = huesped.servicios || [];

  const fechaInicio = new Date(huesped.fechaRegistro);
  const fechaFin = new Date(huesped.fechaSalida);
  this.noches = Math.max(1, Math.ceil((+fechaFin - +fechaInicio) / (1000 * 60 * 60 * 24)));

  this.precioPorNoche = Number(this.habitacion?.precio) || 0;
  const totalServicios = this.serviciosSeleccionados.reduce(
    (acc: number, s: any) => acc + Number(s.precioFinal || s.precio || 0),
    0
  );

  this.cliente.totalServicios = totalServicios;
  this.total = (this.precioPorNoche * this.noches) + totalServicios;

  // 🔹 Conversión a USD (división 7.75)
  const tipoCambio = 7.75;
  this.precioTotalUsd = (this.precioPorNoche * this.noches) / tipoCambio;
  this.totalServiciosUsd = totalServicios / tipoCambio;
  this.totalUsd = this.total / tipoCambio;

  this.mensaje = '';
}
  // ===================== VALIDAR CORREO =====================
  verificarCorreo() {
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.correoValido = patronCorreo.test(this.emailCliente.trim());

    if (this.correoValido) {
      setTimeout(() => this.renderizarBotonPaypal(), 300);
    }
  }

  // ===================== MODAL =====================
  private mostrarModalConMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;
    setTimeout(() => (this.mostrarModal = false), 1500);
  }

  // ===================== PAYPAL =====================
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
    if (!paypal) return;

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

      createOrder: async () => {
  if (!this.emailCliente || !this.emailCliente.trim()) {
    this.mensaje = 'Debe ingresar un correo válido antes de pagar.';
    return Promise.reject('Correo requerido');
  }

  if (!this.totalUsd || this.totalUsd <= 0) {
    this.mensaje = 'Monto inválido.';
    return Promise.reject('Monto inválido');
  }

  // 🔹 Enviamos el total en dólares y especificamos la moneda
  const res = await fetch(`${environment.apiUrl}/api/pagos/crear-orden`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total: this.totalUsd,
      currency: 'USD'
    })
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
            body: JSON.stringify({
              orderId: data.orderID,
              idHuesped: this.cliente.idHuesped
            })
          });

          const capJson = await cap.json();
          if (!capJson) throw new Error('No se pudo capturar la orden');

          // Generar factura
          const fac = await fetch(`${environment.apiUrl}/api/facturas/generar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cliente: {
                nombre: this.cliente.nameHuesped,
                apellido: this.cliente.apellidoHuesped,
                telefono: this.cliente.telefono,
                email: this.emailCliente.trim(),
              },
              habitacion: this.habitacion,
              serviciosSeleccionados: this.serviciosSeleccionados,
              total: this.total,
              pago: 'PayPal'
            })
          });

          const facJson = await fac.json();
          this.mostrarModalConMensaje(
            facJson?.ok
              ? `✅ Factura enviada al correo ${this.emailCliente.trim()}`
              : 'Pago realizado, pero hubo un problema al generar/enviar la factura.'
          );

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

  limpiarBusqueda(): void {
  this.clienteIdentifier = '';
  this.clientesEncontrados = [];
  this.cliente = null;
  this.mensaje = '';
}

}

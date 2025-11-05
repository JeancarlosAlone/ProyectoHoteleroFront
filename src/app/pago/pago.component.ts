import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  // ===================== VARIABLES PRINCIPALES =====================
  cliente: any = null;
  habitacion: any = null;
  serviciosSeleccionados: any[] = [];
  total = 0;
  mensaje = '';
  mostrarModal = false;
  mensajeModal = '';
  emailCliente: string = '';

  nitFactura: string = '';
  moneda: string = 'USD';
  noches: number = 0;
  precioPorNoche: number = 0;

  clienteIdentifier: string = '';
  fechaFiltro: string = '';
  correoValido: boolean = false;


  constructor(private ngZone: NgZone) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.intentarRenderizarBoton();
  }

  // ===================== BUSCAR HUÉSPED =====================
  async buscarCliente() {
    try {
      const query: any = {};
      if (this.clienteIdentifier) query.nombre = this.clienteIdentifier;
      if (this.fechaFiltro) query.fecha = this.fechaFiltro;

      const url = `http://localhost:8080/api/huespedes/pendientes?${new URLSearchParams(query)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data || data.length === 0) {
        this.mensaje = 'No se encontraron huéspedes pendientes con esos filtros.';
        this.cliente = null;
        this.total = 0;
        return;
      }

      const huesped = data[0];
      this.cliente = huesped;
      this.habitacion = huesped.habitacionAsignada;
      this.serviciosSeleccionados = huesped.servicios || [];

      // 📅 Calcular noches y total
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
      this.mensaje = '';
    } catch (err) {
      console.error('Error al buscar cliente pendiente:', err);
      this.mensaje = 'Ocurrió un error al buscar el cliente.';
    }
  }
  verificarCorreo() {
  const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  this.correoValido = patronCorreo.test(this.emailCliente.trim());

  // 🔄 Si el correo se valida correctamente, renderiza el botón
  if (this.correoValido) {
    setTimeout(() => this.renderizarBotonPaypal(), 300);
  }
}

  // ===================== MODAL =====================
  private mostrarModalConMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;
    setTimeout(() => (this.mostrarModal = false), 1200);
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
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

      // Crear orden con validaciones
      createOrder: async () => {
        if (!this.emailCliente || !this.emailCliente.trim()) {
          this.mensaje = 'Debe ingresar un correo válido antes de pagar.';
          return Promise.reject('Correo requerido');
        }

        if (!this.total || this.total <= 0) {
          this.mensaje = 'Monto inválido.';
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

      // Capturar y generar factura
      onApprove: async (data: any) => {
        try {
          this.mensaje = 'Procesando pago...';

          const cap = await fetch('http://localhost:8080/api/pagos/capturar-orden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: data.orderID,
              idHuesped: this.cliente.idHuesped
            })
          });

          const capJson = await cap.json();
          if (!capJson) throw new Error('No se pudo capturar la orden');

          // Generar factura usando el correo manual
          try {
            const fac = await fetch('http://localhost:8080/api/facturas/generar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cliente: {
                  nombre: this.cliente.nameHuesped,
                  apellido: this.cliente.apellidoHuesped,
                  telefono: this.cliente.telefono,
                  email: this.emailCliente.trim(), // 👈 correo manual
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
          } catch (err) {
            console.error('Error al generar factura:', err);
            this.mostrarModalConMensaje('Pago realizado, pero hubo un problema al generar la factura.');
          }

          // Redirección final
          setTimeout(() => {
            this.ngZone.run(() => {
              window.location.href = 'http://localhost:4200/SACH/habitaciones';
            });
          }, 3500);
        } catch (err) {
          console.error(err);
          this.mensaje = 'Error en PayPal';
          this.ngZone.run(() => {
            window.location.href = 'http://localhost:4200/SACH/habitaciones';
          });
        }
      },

      onError: (err: any) => {
        console.error(err);
        this.mensaje = 'Error en PayPal';
      }
    }).render('#paypal-button-container');
  }
}

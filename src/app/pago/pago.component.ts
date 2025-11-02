import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare global {
  interface Window { paypal: any; }
}

@Component({
  standalone: true,
  selector: 'app-pago',
  imports: [CommonModule, FormsModule],
  templateUrl: './pago.component.html',
  styleUrls: ['./pago.component.css']
})
export class PagoComponent implements AfterViewInit, OnDestroy {
  clienteIdentifier = '';
  cliente: any = null;
  total: number = 0;
  moneda = 'USD';
  mensaje = '';

  // Solo NIT (campo obligatorio opcional según tu lógica)
  nitFactura: string = '';

  // Nuevas propiedades para cálculo por noches
  noches: number = 1;
  precioPorNoche: number = 0;

  private buttonsRendered = false;
  private paypalButtonsInstance: any = null;

  constructor() { }

  ngAfterViewInit(): void {
    this.intentarRenderizarBoton();
  }

  ngOnDestroy(): void {
    try {
      if (this.paypalButtonsInstance && this.paypalButtonsInstance.close) {
        this.paypalButtonsInstance.close();
      }
    } catch (e) { }
  }

  private intentarRenderizarBoton() {
    const intentar = () => {
      if ((window as any).paypal) {
        this.renderizarBotonPaypal();
      } else {
        setTimeout(intentar, 200);
      }
    };
    intentar();
  }

  private renderizarBotonPaypal() {
    if (this.buttonsRendered) return;
    const paypal = (window as any).paypal;

    this.paypalButtonsInstance = paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

      createOrder: (data: any, actions: any) => {
        if (!this.total || this.total <= 0) {
          this.mensaje = 'Ingresa un monto válido antes de continuar';
          return Promise.reject('Monto inválido');
        }

        // Llamada al backend para crear la orden (URL absoluta al backend)
        // Enviamos también nitFactura para que el backend pueda guardarlo o usarlo como invoice_id
        return fetch('http://localhost:8080/api/pagos/crear-orden', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            total: this.total,
            nitFactura: this.nitFactura
          })
        })
          .then(res => res.json())
          .then(data => {
            const orderId = data?.id || data?.orderID || data?.order?.id || data?.data?.id;
            if (!orderId) {
              console.error('Respuesta crear-orden inesperada:', data);
              throw new Error('No se obtuvo orderId del backend');
            }
            return orderId;
          });
      },

      onApprove: (data: any, actions: any) => {
        this.mensaje = 'Procesando pago...';

        return fetch('http://localhost:8080/api/pagos/capturar-orden', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: data.orderID,
            idHuesped: this.cliente?.idHuesped  // 👈 enviamos el huésped actual
          })
        })

          .then(res => res.json())
          .then(result => {
            console.log('Resultado captura:', result);
            this.mensaje = 'Pago capturado y registrado correctamente';
          })
          .catch((error: any) => {
            console.error('Error al capturar en backend:', error);
            this.mensaje = 'Error al capturar el pago. Revisa la consola.';
          });
      },

      onError: (err: any) => {
        console.error('PayPal Buttons Error', err);
        this.mensaje = 'Error en PayPal: ' + (err?.message || err);
      },

      onCancel: (data: any) => {
        this.mensaje = 'Pago cancelado por el usuario';
      }
    });

    this.paypalButtonsInstance.render('#paypal-button-container');
    this.buttonsRendered = true;
  }

  // Búsqueda por nameHuesped (normalizada con la estructura real del backend)
  buscarCliente() {
    if (!this.clienteIdentifier) {
      this.mensaje = 'Ingresa el nombre del cliente';
      return;
    }

    fetch('http://localhost:8080/api/huespedes', {
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener huéspedes');
        return res.json();
      })
      .then((data: any) => {
        const lista: any[] = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);

        const q = this.clienteIdentifier.trim().toLowerCase();

        const encontrado = lista.find(h => {
          const nombre = (h.nameHuesped || h.name || h.nombre || '').toString().toLowerCase();
          const apellido = (h.apellidoHuesped || h.apellido || '').toString().toLowerCase();
          const full = `${nombre} ${apellido}`.trim();
          return nombre.includes(q) || apellido.includes(q) || full.includes(q);
        });

        if (encontrado) {
          this.cliente = encontrado;

          // 🔒 Verificar si el cliente ya está cancelado
          if (encontrado.statusHuesped?.toLowerCase() === 'cancelado') {
            this.mensaje = 'Este cliente ya completó su pago y no puede volver a pagar.';
            this.cliente = null;
            this.total = 0;
            this.precioPorNoche = 0;
            this.noches = 1;
            return;
          }

          // calcular noches a partir de fechas (fallback seguro)
          const fechaInicioStr = encontrado.fechaRegistro;
          const fechaSalidaStr = encontrado.fechaSalida;

          this.noches = 1;
          if (fechaInicioStr && fechaSalidaStr) {
            try {
              const start = new Date(fechaInicioStr);
              const end = new Date(fechaSalidaStr);
              const msPerDay = 24 * 60 * 60 * 1000;

              // usar horas UTC para evitar problemas de timezone
              const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
              const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
              const diffDays = Math.floor((utcEnd - utcStart) / msPerDay);
              this.noches = Math.max(1, diffDays);
            } catch (e) {
              this.noches = 1;
            }
          }

          // determinar precio por noche (preferir habitacionAsignada.precio)
          const precioHabitacion = encontrado.habitacionAsignada?.precio ?? null;
          if (precioHabitacion !== null && precioHabitacion !== undefined) {
            this.precioPorNoche = parseFloat(precioHabitacion) || 0;
          } else if (encontrado.monto !== undefined && encontrado.monto !== null) {
            // si no hay precio por noche, intentamos inferir (monto puede ser total o por noche;
            // asumimos que 'monto' podría ser precio por noche en tu modelo actual)
            this.precioPorNoche = parseFloat(encontrado.monto) || 0;
          } else {
            this.precioPorNoche = 0;
          }

          // finalmente calculamos el total por noches
          this.total = +(this.precioPorNoche * this.noches);

          this.mensaje = '';
        } else {
          this.cliente = null;
          this.noches = 1;
          this.precioPorNoche = 0;
          this.mensaje = 'No se encontró cliente por ese nombre';
        }
      })
      .catch((error: any) => {
        console.error('Error buscando huéspedes:', error);
        this.cliente = null;
        this.noches = 1;
        this.precioPorNoche = 0;
        this.mensaje = 'No se encontró cliente o hubo error';
      });
  }
}





import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RoomsService } from '../Habitaciones/rooms.service';
import { Room, TypesRoomsStatus } from '../Habitaciones/rooms.model';
import { ReservaService } from '../services/reserva.service';
import { HuespedService } from '../Huesped/huesped.service';
import { HuespedRequest } from '../Huesped/huesped.model';


@Component({
  selector: 'app-reservacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservacion.component.html',
  styleUrls: ['./reservacion.component.css']
})
export class ReservacionComponent implements OnInit {
  habitacion: Room | null = null;
  isLoading = true;
  mostrarModal = false;
  mensajeModal = '';

  mostrarModalConMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;

    setTimeout(() => {
      this.mostrarModal = false;
    }, 2500);
  }

  // Datos del cliente
  cliente = {
    nombre: '',
    apellido: '',
    dpi: '',
    telefono: '',
    email: '',
    numPersonas: 1,
    fechaInicio: '',
    fechaFin: ''
  };

  errores: any = {};
  minFechaEntrada = '';
  minFechaSalida = '';

  mostrarMenuServicios = false;
  nochesSeleccionadas = 0;

  listaServicios = [
    {
      nombre: 'Estacionamiento privado',
      descripcion: 'Espacio exclusivo con vigilancia 24/7 dentro del hotel.',
      precio: 50, descuento: 0, precioFinal: 50,
      imagen: 'assets/img/servicios/estacionamiento.jpg', seleccionado: false
    },
    {
      nombre: 'Desayuno incluido',
      descripcion: 'Buffet variado con platillos típicos y opciones internacionales.',
      precio: 20, descuento: 0, precioFinal: 20,
      imagen: 'assets/img/servicios/desayuno.jpg', seleccionado: false
    },
    {
      nombre: 'Spa / Masajes',
      descripcion: 'Servicio de relajación y masajes terapéuticos personalizados.',
      precio: 200, descuento: 0, precioFinal: 200,
      imagen: 'assets/img/servicios/spa.jpg', seleccionado: false
    },
    {
      nombre: 'Gimnasio',
      descripcion: 'Acceso ilimitado al gimnasio equipado con máquinas modernas.',
      precio: 75, descuento: 0, precioFinal: 75,
      imagen: 'assets/img/servicios/gimnasio.jpg', seleccionado: false
    },
    {
      nombre: 'Piscina climatizada',
      descripcion: 'Piscina con temperatura regulada y vista panorámica.',
      precio: 100, descuento: 0, precioFinal: 100,
      imagen: 'assets/img/servicios/piscina.jpg', seleccionado: false
    },
    {
      nombre: 'Área de lavandería',
      descripcion: 'Lavandería autoservicio y servicio express.',
      precio: 25, descuento: 0, precioFinal: 25,
      imagen: 'assets/img/servicios/lavanderia.jpg', seleccionado: false
    },
    {
      nombre: 'Entretenimiento para adultos',
      descripcion: 'Acceso a bar temático y shows nocturnos exclusivos.',
      precio: 100, descuento: 0, precioFinal: 100,
      sesiones: 1,
      imagen: 'assets/img/servicios/entretenimiento.jpg',
      seleccionado: false
    }
  ];

  serviciosSeleccionados: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private roomsService: RoomsService,
    private router: Router,
    private reservaService: ReservaService,
    private huespedService: HuespedService
  ) { }



  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarHabitacion(id);

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    this.minFechaEntrada = `${yyyy}-${mm}-${dd}`;
    this.minFechaSalida = this.minFechaEntrada;

    if (!this.cliente.fechaInicio) {
      this.cliente.fechaInicio = this.minFechaEntrada;
    }
  }

  actualizarFechaSalida() {
    if (this.cliente.fechaInicio) {
      const entrada = new Date(this.cliente.fechaInicio);
      entrada.setDate(entrada.getDate() + 1);
      const yyyy = entrada.getFullYear();
      const mm = String(entrada.getMonth() + 1).padStart(2, '0');
      const dd = String(entrada.getDate()).padStart(2, '0');
      this.minFechaSalida = `${yyyy}-${mm}-${dd}`;
    }
  }

  cargarHabitacion(id: number) {
    this.roomsService.getRoomById(id).subscribe({
      next: (data) => {
        this.habitacion = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar habitación:', err);
        this.isLoading = false;
      }
    });
  }

  validarDatosCliente(): boolean {
    const c = this.cliente;
    this.errores = {};
    let valido = true;

    if (!c.nombre) { this.errores.nombre = 'El nombre es obligatorio.'; valido = false; }
    if (!c.apellido) { this.errores.apellido = 'El apellido es obligatorio.'; valido = false; }
    if (!c.dpi) { this.errores.dpi = 'El DPI es obligatorio.'; valido = false; }
    if (!c.telefono) { this.errores.telefono = 'El teléfono es obligatorio.'; valido = false; }
    if (!c.email) { this.errores.email = 'El correo electrónico es obligatorio.'; valido = false; }
    if (!c.numPersonas) { this.errores.numPersonas = 'Indica el número de personas.'; valido = false; }
    if (!c.fechaInicio) { this.errores.fechaInicio = 'La fecha de entrada es obligatoria.'; valido = false; }
    if (!c.fechaFin) { this.errores.fechaFin = 'La fecha de salida es obligatoria.'; valido = false; }

    return valido;
  }

  irAPago() {
    if (!this.validarDatosCliente()) return;
    if (!this.habitacion) {
      alert('Primero selecciona una habitación válida.');
      return;
    }

    const serviciosSeleccionados = this.listaServicios.filter(s => s.seleccionado);
    const habitacionCompleta = { ...this.habitacion };
    const totalServicios = serviciosSeleccionados.reduce((acc, s) => acc + (s.precioFinal || 0), 0);
    const total = (this.habitacion.precio || 0) + totalServicios;

    const reservaData = { habitacion: habitacionCompleta, cliente: this.cliente, serviciosSeleccionados, total };
    this.reservaService.setReserva(reservaData);
    this.router.navigate(['/pago-reserva']);
  }

  abrirMenuServicios() {
    if (!this.validarDatosCliente()) return;
    const { fechaInicio, fechaFin } = this.cliente;
    let noches = 1;

    if (fechaInicio && fechaFin) {
      try {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const diffMs = fin.getTime() - inicio.getTime();
        noches = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } catch { noches = 1; }
    }

    this.nochesSeleccionadas = noches;
    this.listaServicios = this.listaServicios.map(servicio => {
      let descuento = 0;
      let precioFinal = servicio.precio;

      if (servicio.nombre === 'Estacionamiento privado') {
        if (noches >= 5) descuento = 20;
        else if (noches === 4) descuento = 15;
        else if (noches === 3) descuento = 10;
        precioFinal = servicio.precio - (servicio.precio * descuento / 100);
      } else if (servicio.nombre === 'Desayuno incluido') {
        const precioBase = 20;
        if (noches === 2) descuento = 10;
        else if (noches === 3) descuento = 20;
        else if (noches >= 4) descuento = 25;
        const precioConDescuento = precioBase * (1 - descuento / 100);
        precioFinal = precioConDescuento * noches;
      } else if (servicio.nombre === 'Spa / Masajes') {
        if (noches >= 5) descuento = 25;
        else if (noches === 4) descuento = 20;
        else if (noches === 3) descuento = 10;
        precioFinal = servicio.precio - (servicio.precio * descuento / 100);
      } else if (servicio.nombre === 'Gimnasio') {
        if (noches >= 4) descuento = 20;
        else if (noches === 3) descuento = 10;
        precioFinal = servicio.precio - (servicio.precio * descuento / 100);
      } else if (servicio.nombre === 'Piscina climatizada') {
        if (noches >= 4) descuento = 15;
        else if (noches === 3) descuento = 10;
        precioFinal = servicio.precio - (servicio.precio * descuento / 100);
      } else if (servicio.nombre === 'Área de lavandería') {
        if (noches >= 4) descuento = 10;
        else if (noches === 3) descuento = 5;
        precioFinal = servicio.precio - (servicio.precio * descuento / 100);
      } else if (servicio.nombre === 'Entretenimiento para adultos') {
        const sesiones = servicio.sesiones || 1;
        precioFinal = 100 * sesiones;
      }

      return { ...servicio, descuento, precioFinal };
    });

    this.mostrarMenuServicios = true;
  }

  cerrarMenuServicios() {
    this.mostrarMenuServicios = false;
  }

  cambiarSesiones(servicio: any, incremento: number) {
    servicio.sesiones = Math.max(1, (servicio.sesiones || 1) + incremento);
    servicio.precioFinal = servicio.precio * servicio.sesiones;
  }

  guardarServicios() {
    this.serviciosSeleccionados = this.listaServicios.filter(s => s.seleccionado);
    this.mostrarMenuServicios = false;
  }

  reservarSinPagar(): void {
    if (!this.validarDatosCliente()) return;
    if (!this.habitacion) {
      this.mostrarModalConMensaje('Primero selecciona una habitación válida.');
      return;
    }

    const idUser = localStorage.getItem('idUser');
    if (!idUser) {
      this.mostrarModalConMensaje('No se encontró el usuario en sesión.');
      setTimeout(() => this.router.navigate(['/login']), 2500);
      return;
    }

    //  Recolectamos los servicios seleccionados
    const serviciosSeleccionados = this.listaServicios.filter(s => s.seleccionado);
    const totalServicios = serviciosSeleccionados.reduce((acc, s) => acc + (Number(s.precioFinal) || 0), 0);
    const precioHabitacion = Number(this.habitacion?.precio) || 0;
    const montoTotal = precioHabitacion + totalServicios;

    // 🔹 Armamos el payload completo
    const huespedRequest: HuespedRequest = {
      nameHuesped: this.cliente.nombre,
      apellidoHuesped: this.cliente.apellido,
      telefono: this.cliente.telefono,
      numPersonas: this.cliente.numPersonas,
      monto: montoTotal,
      statusHuesped: 'pendiente de pago',
      fechaRegistro: this.cliente.fechaInicio,
      fechaSalida: this.cliente.fechaFin,
      usuarioRegistrador: { id_users: String(idUser) },
      habitacionAsignada: { id_Rooms: this.habitacion!.id_Rooms },
      serviciosSeleccionados
    };

    console.log('Enviando huésped al backend:', huespedRequest);

    this.huespedService.createHuesped(huespedRequest).subscribe({
      next: () => {
        this.mostrarModalConMensaje('Reserva registrada con éxito.');
        setTimeout(() => this.router.navigate(['/SACH/habitaciones']), 2500);
      },
      error: (err) => {
        console.error('Error al registrar huésped:', err);
        this.mostrarModalConMensaje('Error al registrar el huésped.');
      }
    });
  }
  // 🧹 Limpiar formulario
  limpiarCampos() {
    this.cliente = {
      nombre: '',
      apellido: '',
      dpi: '',
      telefono: '',
      email: '',
      numPersonas: 1,
      fechaInicio: this.minFechaEntrada,
      fechaFin: ''
    };
    this.errores = {};
  }


}

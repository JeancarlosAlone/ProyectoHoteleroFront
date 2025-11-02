import { Component, OnInit, output, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

import { HuespedService } from '../../Huesped/huesped.service';
import { HuespedResponse } from '../../Huesped/huesped.model';
import { RoomsService } from '../../Habitaciones/rooms.service';
import { TypesRoomsStatus } from '../../Habitaciones/rooms.model';
import { ActivatedRoute } from '@angular/router';
import { map, Observable, take } from 'rxjs';



@Component({
  selector: 'app-form-registro',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatOptionModule,
    CommonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDividerModule,
  ],
  templateUrl: './form-registro.component.html',
  styleUrls: ['./form-registro.component.css'],
})

export class FormRegistroComponent implements OnInit {
  formulario!: FormGroup;
  idRoomFromRoute!: number;
  readonly idUsuarioRegistrador = output<string>();
  readonly estadosHuesped = ['pendiente de pago', 'cancelado'];

  constructor(
    private fb: FormBuilder,
    private huespedService: HuespedService,
    private habitacionService: RoomsService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.idRoomFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    this.initForm();
    this.setUserIdFromLocalStorage();

    this.huespedService.huespedAEditar$.pipe(take(1)).subscribe(huesped => {
      if (huesped) {
        this.initForm(huesped);
      } else {
        this.autollenarSiHuespedActivo();
      }
    });
  }

  private initForm(data?: HuespedResponse) {
    this.formulario = this.fb.group({
      idHuesped: [data?.idHuesped],
      nameHuesped: [data?.nameHuesped || '', Validators.required],
      apellidoHuesped: [data?.apellidoHuesped || '', Validators.required],
      telefono: [data?.telefono || '', [Validators.required, Validators.pattern(/^\d{8,15}$/), Validators.maxLength(15)]],
      numPersonas: [data?.numPersonas ?? 1, [Validators.required, Validators.min(1)]],
      monto: [data?.monto ?? 0, [Validators.required, Validators.min(1)]],
      statusHuesped: [data?.statusHuesped || 'pendiente de pago', [Validators.required]],
      fechaRegistro: [data?.fechaRegistro || null, Validators.required],
      fechaSalida: [data?.fechaSalida || null, Validators.required],
      usuarioRegistrador: this.fb.group({
        id_users: [data?.usuarioRegistrador?.id_users || '', Validators.required],
      }),
      habitacionAsignada: this.fb.group({
        id_Rooms: [data?.habitacionAsignada?.id_Rooms || '', Validators.required],
      }),
    });
  }

  private setUserIdFromLocalStorage() {
    const idUser = localStorage.getItem('idUser');
    if (idUser) {
      this.formulario.get('usuarioRegistrador.id_users')?.setValue(idUser);
      this.formulario.get('habitacionAsignada.id_Rooms')?.setValue(this.idRoomFromRoute)
    }
  }

  private autollenarSiHuespedActivo() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    this.huespedService.getHuespedes().subscribe((huespedes) => {
      const huespedActivo = huespedes.find(h => {
        const inicio = new Date(h.fechaRegistro ?? new Date()); // Si es undefined, usa la fecha actual
        const fin = new Date(h.fechaSalida ?? new Date()); // Si es undefined, usa la fecha actual

        inicio.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);

        return (
          hoy >= inicio &&
          hoy <= fin &&
          h.habitacionAsignada?.id_Rooms === this.idRoomFromRoute
        );
      });

      if (huespedActivo) {
        this.formulario.patchValue(huespedActivo);
        const idUser = huespedActivo.usuarioRegistrador?.id_users;
        if (idUser) {
          this.idUsuarioRegistrador.emit(idUser); // Emitimos con output()
        }
      }
    });
  }

  cancelar() {
    this.formulario.reset();
    this.huespedService.clearHuespedAEditar();
  }

  onSubmit() {
    if (this.formulario.valid) {
      const huespedRequest = this.formulario.value;
      const idHuesped = this.formulario.get('idHuesped')?.value;

      const fechaInicio = new Date(huespedRequest.fechaRegistro);
      const fechaFin = new Date(huespedRequest.fechaSalida);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin.setHours(0, 0, 0, 0);

      const esNuevo = !idHuesped;

      this.verificarTraslapeDeFechas(fechaInicio, fechaFin).pipe(take(1)).subscribe(hayTraslape => {
        if (esNuevo && hayTraslape) {
          confirm('Ya existe una reservación que se cruza con estas fechas en esta habitación.');
          return;
        }

        const cambiarEstadoSiEsHoy = () => {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          if (fechaInicio.getTime() === hoy.getTime()) {
            this.habitacionService.changeStatus(
              huespedRequest.habitacionAsignada.id_Rooms,
              TypesRoomsStatus.ocupada
            ).subscribe({
              error: () => confirm('Error al actualizar habitación:')
            });
          }
        };

        const onSuccess = (msg: string) => {
          confirm(msg);
          cambiarEstadoSiEsHoy();
          this.formulario.reset();
          this.huespedService.clearHuespedAEditar();
        };

        if (idHuesped) {
          this.huespedService.updateHuesped(idHuesped, huespedRequest).subscribe({
            next: () => onSuccess('Huésped actualizado con éxito'),
            error: (err) => console.error('Error al actualizar huésped:', err)
          });
        } else {
          this.huespedService.createHuesped(huespedRequest).subscribe({
            next: () => onSuccess('Huésped registrado con éxito'),
            error: () => confirm('Error al registrar el huésped')
          });
        }
      });
    } else {
      this.formulario.markAllAsTouched();
    }
  }
  reservarSinPagar() {
    if (this.formulario.valid) {
      const huespedRequest = this.formulario.value;
      huespedRequest.statusHuesped = 'pendiente de pago'; // estado pendiente
      huespedRequest.habitacionAsignada = { id_Rooms: this.idRoomFromRoute };

      // Guardamos el huésped en BD
      this.huespedService.createHuesped(huespedRequest).subscribe({
        next: () => {
          confirm('Reserva registrada como pendiente de pago.');

          // Cambiamos estado de habitación a "ocupada"
          this.habitacionService.changeStatus(
            this.idRoomFromRoute,
            'ocupada'
          ).subscribe({
            next: () => console.log('Habitación marcada como ocupada'),
            error: () => confirm('Error al actualizar habitación.')
          });

          this.formulario.reset();
        },
        error: (err) => console.error('Error al registrar huésped:', err)
      });
    } else {
      confirm('Completa todos los campos requeridos antes de continuar.');
      this.formulario.markAllAsTouched();
    }
  }

  abrirMenuServicios() {
    confirm('Aquí se mostrarán los servicios adicionales.');
  }

  irAPago() {
    confirm('Aquí se iniciará el flujo de pago con PayPal.');
  }


  nuevaReservacion() {
    this.huespedService.clearHuespedAEditar(); // Por si venía de una edición
    this.initForm(); // Reiniciamos el formulario sin datos
    this.setUserIdFromLocalStorage(); // Reasignamos los campos autocompletables
  }

  private verificarTraslapeDeFechas(fechaInicio: Date, fechaFin: Date): Observable<boolean> {
    const idHuespedActual = this.formulario.get('idHuesped')?.value;

    return this.huespedService.getHuespedes().pipe(
      map(huespedes => {
        return huespedes.some(h => {
          if (h.idHuesped === idHuespedActual) {
            return false; // Ignora la misma reservación si estamos editando
          }

          const inicio = new Date(h.fechaRegistro ?? new Date()); // Si es undefined, usa la fecha actual
          const fin = new Date(h.fechaSalida ?? new Date()); // Si es undefined, usa la fecha actual

          const mismaHabitacion = h.habitacionAsignada?.id_Rooms === this.idRoomFromRoute;

          inicio.setHours(0, 0, 0, 0);
          fin.setHours(0, 0, 0, 0);

          return (
            mismaHabitacion &&
            (fechaInicio < fin && fechaFin > inicio)
          );
        });
      })
    );
  }
}

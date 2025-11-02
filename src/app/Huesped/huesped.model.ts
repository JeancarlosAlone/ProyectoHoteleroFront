import { Room } from "../Habitaciones/rooms.model";
import { User } from "../Users/user.model";

/**
 * Modelo actualizado:
 * - Se agregan los campos para manejar el tipo de registro (manual / en línea)
 * - Se mantienen los tipos opcionales para evitar warnings.
 */

export interface Huesped {
  nameHuesped: string;
  apellidoHuesped: string;
  telefono?: string;
  numPersonas?: number;
  monto?: number;
  statusHuesped?: string;
  fechaRegistro?: string; // ISO date string
  fechaSalida?: string;   // ISO date string

  /** 🔹 Nuevo campo: tipo de registro del huésped */
  tipoRegistro?: 'manual' | 'enLinea' | string;
}

export interface HuespedRequest extends Huesped {
  usuarioRegistrador?: { id_users: string } | null;
  habitacionAsignada?: { id_Rooms: number } | null;
}

export interface HuespedResponse extends Huesped {
  idHuesped: string;
  usuarioRegistrador?: User | null;
  habitacionAsignada?: Room | null;
}

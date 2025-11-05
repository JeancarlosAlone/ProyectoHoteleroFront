import { Room } from "../Habitaciones/rooms.model";
import { User } from "../Users/user.model";

export interface Huesped {
  nameHuesped: string;
  apellidoHuesped: string;
  telefono?: string;
  numPersonas?: number;
  monto?: number;
  statusHuesped?: string;
  fechaRegistro?: string;
  fechaSalida?: string;
  tipoRegistro?: 'manual' | 'enLinea' | string;
}

export interface HuespedRequest {
  nameHuesped: string;
  apellidoHuesped: string;
  telefono: string;
  numPersonas: number;
  monto: number;
  statusHuesped: string;
  fechaRegistro: string;
  fechaSalida: string;
  usuarioRegistrador: { id_users: string };
  habitacionAsignada: { id_Rooms: number };
  serviciosSeleccionados?: any[];
}

export interface HuespedResponse extends Huesped {
  idHuesped: string;
  id_users?: string | null;
  usuarioRegistrador?: User | null;

  /**
   * 🔹 Campo opcional con ID directo de la habitación
   * (para cuando el backend no devuelve el objeto anidado)
   */
  id_Rooms?: number;

  /**
   * 🔹 Objeto completo de habitación (cuando se incluye relación)
   */
  habitacionAsignada?: {
    id_Rooms: number;
    estado: 'ocupada' | 'libre' | 'limpieza';
    habitacion?: string;
    nivel?: string;
    precio?: number;
    image_url?: string;
  } | null;
}

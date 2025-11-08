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

 
  id_Rooms?: number;

 
  habitacionAsignada?: {
    id_Rooms: number;
    estado: 'ocupada' | 'libre' | 'limpieza';
    habitacion?: string;
    nivel?: string;
    precio?: number;
    image_url?: string;
  } | null;

  
  montoUSD?: number;
}


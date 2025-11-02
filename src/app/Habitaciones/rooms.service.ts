import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Room, TypesRoomsStatus } from './rooms.model';

@Injectable({
  providedIn: 'root'
})
export class RoomsService {
  //  Fuente de datos reactiva
  private roomsSubject = new BehaviorSubject<Room[]>([]);
  rooms$ = this.roomsSubject.asObservable();

  //  URL base (ajustada correctamente)
  private baseUrl = 'http://localhost:8080/api/rooms';
  private _http = inject(HttpClient);

  constructor(private http: HttpClient) {}

  //  Cargar todas las habitaciones y actualizar el BehaviorSubject
  loadRooms(): void {
    this._http.get<Room[]>(this.baseUrl).subscribe((rooms) => {
      this.roomsSubject.next([...rooms]); // se copia el array por seguridad
    });
  }

  //  Obtener habitaciones como Observable (desde el BehaviorSubject)
  getRooms(): Observable<Room[]> {
    return this.rooms$;
  }

  //  Obtener habitación por ID
  getRoomById(id: number): Observable<Room> {
    return this._http.get<Room>(`${this.baseUrl}/${id}`);
  }

  //  Crear habitación
  createRoom(room: Room): Observable<Room> {
    return this._http.post<Room>(this.baseUrl, room).pipe(
      tap(() => this.loadRooms())
    );
  }

  //  Actualizar habitación
  updateRoom(id_rooms: number, room: Room): Observable<Room> {
    return this._http.put<Room>(`${this.baseUrl}/${id_rooms}`, room).pipe(
      tap(() => this.loadRooms())
    );
  }

  //  Eliminar habitación
  deleteRoom(id: number): Observable<Room> {
    return this._http.delete<Room>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.loadRooms())
    );
  }

  //  Cambiar estado (ocupada, libre, limpieza)
  changeStatus(id: number, status: string): Observable<TypesRoomsStatus> {
    return this._http.patch<TypesRoomsStatus>(`${this.baseUrl}/${id}/estado`, { estado: status });
  }

  //  Obtener habitaciones directamente del backend (sin BehaviorSubject)
  getAllRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(this.baseUrl);
  }

  //  Obtener habitaciones disponibles (filtro por fechas)
  getRoomsDisponibles(fechaInicio: string, fechaFin: string, numPersonas: number): Observable<Room[]> {
    const url = `${this.baseUrl}/disponibles?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&numPersonas=${numPersonas}`;
    return this.http.get<Room[]>(url);
  }
}

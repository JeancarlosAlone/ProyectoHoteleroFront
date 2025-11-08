import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HuespedRequest, HuespedResponse } from './huesped.model';

@Injectable({
  providedIn: 'root'
})
export class HuespedService {
  private _http = inject(HttpClient);
  private huespedUrl = 'http://localhost:8080/huesped';
  private roomsUrl = 'http://localhost:8080/rooms'; 

  private huespedSubject = new BehaviorSubject<HuespedResponse[]>([]);
  huesped$ = this.huespedSubject.asObservable();

  private huespedAEditarSubject = new BehaviorSubject<HuespedResponse | null>(null);
  huespedAEditar$ = this.huespedAEditarSubject.asObservable();

  private manualHuespedes: HuespedResponse[] = [];
  private enLineaHuespedes: HuespedResponse[] = [];

  setHuespedAEditar(huesped: HuespedResponse) {
    this.huespedAEditarSubject.next(huesped);
  }

  clearHuespedAEditar() {
    this.huespedAEditarSubject.next(null);
  }

  loadHuespedes() {
    this._http.get<HuespedResponse[]>(this.huespedUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.huespedSubject.next([]);
          return of([]);
        }
        return throwError(() => error);
      })
    ).subscribe((huespedes) => {
      const nuevos = huespedes.map(h => ({ ...h }));
      this.huespedSubject.next(nuevos);

      // Clasificación por tipoRegistro
      this.manualHuespedes = nuevos.filter(h => h.tipoRegistro === 'manual');
      this.enLineaHuespedes = nuevos.filter(h => h.tipoRegistro === 'enLinea');
    });
  }

  getHuespedes(tipo: 'todos' | 'manual' | 'enlinea' = 'todos') {
    return this._http.get<HuespedResponse[]>(`${this.huespedUrl}?tipo=${tipo}`);
  }

  getHuespedbyId(id: string): Observable<HuespedResponse> {
    return this._http.get<HuespedResponse>(`${this.huespedUrl}/${id}`);
  }

  createHuesped(huesped: HuespedRequest): Observable<HuespedRequest> {
    return this._http.post<HuespedRequest>(this.huespedUrl, huesped).pipe(
      tap(() => this.loadHuespedes())
    );
  }

  updateHuesped(id_huesped: string, huesped: HuespedRequest): Observable<HuespedRequest> {
    return this._http.put<HuespedRequest>(`${this.huespedUrl}/${id_huesped}`, huesped).pipe(
      tap(() => this.loadHuespedes())
    );
  }

  deleteHuesped(id: string): Observable<HuespedRequest> {
    return this._http.delete<HuespedRequest>(`${this.huespedUrl}/${id}`).pipe(
      tap(() => this.loadHuespedes())
    );
  }

  actualizarEstadoHabitacion(idRoom: number, nuevoEstado: string): Observable<any> {
    return this._http.patch(`${this.roomsUrl}/${idRoom}/estado`, { estado: nuevoEstado }).pipe(
      tap(() => console.log(`Habitación ${idRoom} actualizada a estado: ${nuevoEstado}`)),
      catchError(err => {
        console.error('Error al actualizar la habitación:', err);
        return throwError(() => err);
      })
    );
  }
}

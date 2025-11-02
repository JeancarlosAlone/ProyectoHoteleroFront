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

  private huespedSubject = new BehaviorSubject<HuespedResponse[]>([]);
  huesped$ = this.huespedSubject.asObservable();

  private huespedAEditarSubject = new BehaviorSubject<HuespedResponse | null>(null);
  huespedAEditar$ = this.huespedAEditarSubject.asObservable();

  // === NUEVO: campo para cachear los resultados filtrados ===
  private manualHuespedes: HuespedResponse[] = [];
  private enLineaHuespedes: HuespedResponse[] = [];

  // ============================
  // 🔹 MÉTODOS EXISTENTES
  // ============================
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

      // NUEVO: clasificar por tipoRegistro si existe
      this.manualHuespedes = nuevos.filter(h => h.tipoRegistro === 'manual');
      this.enLineaHuespedes = nuevos.filter(h => h.tipoRegistro === 'enLinea');
    });
  }

  getHuespedes(): Observable<HuespedResponse[]> {
    if (this.huespedSubject.value.length === 0) {
      this.loadHuespedes(); // Solo carga si está vacío
    }
    return this.huesped$;
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

  // ============================
  // 🔹 NUEVOS MÉTODOS DE FILTRO
  // ============================

  /** Obtiene todos los huéspedes manuales */
  getHuespedesManuales(): Observable<HuespedResponse[]> {
    if (this.manualHuespedes.length > 0) {
      return of(this.manualHuespedes);
    }
    return this._http.get<HuespedResponse[]>(`${this.huespedUrl}?tipoRegistro=manual`).pipe(
      tap(huespedes => this.manualHuespedes = huespedes)
    );
  }

  /** Obtiene todos los huéspedes registrados en línea */
  getHuespedesEnLinea(): Observable<HuespedResponse[]> {
    if (this.enLineaHuespedes.length > 0) {
      return of(this.enLineaHuespedes);
    }
    return this._http.get<HuespedResponse[]>(`${this.huespedUrl}?tipoRegistro=enLinea`).pipe(
      tap(huespedes => this.enLineaHuespedes = huespedes)
    );
  }
}

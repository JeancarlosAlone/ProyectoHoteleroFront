import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FacturasService {
  private baseUrl = 'http://localhost:8080/api/facturas';

  constructor(private http: HttpClient) {}

  listarFacturas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/listar`);
  }
}

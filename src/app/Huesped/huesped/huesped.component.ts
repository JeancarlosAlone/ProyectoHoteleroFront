import { Component, OnInit } from '@angular/core';
import { HuespedService } from '../huesped.service';
import { HuespedResponse } from '../huesped.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-huesped',
  templateUrl: './huesped.component.html',
  imports: [CommonModule],
  styleUrls: ['./huesped.component.css']
})
export class HuespedComponent implements OnInit {
  huespedes: HuespedResponse[] = [];
  huespedesFiltrados: HuespedResponse[] = [];
  activeTab: 'todos' | 'manual' | 'enLinea' = 'todos';

  constructor(private huespedService: HuespedService) {}

  ngOnInit() {
    this.huespedService.getHuespedes().subscribe(data => {
      this.huespedes = data;
      this.filtrar();
    });
  }

  setActive(tab: 'todos' | 'manual' | 'enLinea') {
    this.activeTab = tab;
    this.filtrar();
  }

  filtrar() {
    if (this.activeTab === 'todos') {
      this.huespedesFiltrados = this.huespedes;
    } else {
      this.huespedesFiltrados = this.huespedes.filter(
        h => h.tipoRegistro === this.activeTab
      );
    }
  }
}

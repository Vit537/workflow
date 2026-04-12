import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PoliticaService } from '../../shared/services/politica.service';
import { PoliticaResumen } from '../../shared/models/policy.model';

@Component({
  selector: 'app-busqueda-politicas',
  templateUrl: './busqueda-politicas.component.html',
  styleUrls: ['./busqueda-politicas.component.scss'],
  standalone: false,
})
export class BusquedaPoliticasComponent implements OnInit {
  busqueda = new FormControl('');
  politicas: PoliticaResumen[] = [];
  cargando = false;
  sinResultados = false;

  columnas = ['nombre', 'descripcion', 'creadoPor', 'acciones'];

  constructor(
    private politicaService: PoliticaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buscar('');

    this.busqueda.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(q => this.buscar(q ?? ''));
  }

  buscar(q: string): void {
    this.cargando = true;
    this.sinResultados = false;
    this.politicaService.buscarPoliticasPublicadas(q).subscribe({
      next: (result) => {
        this.politicas = result;
        this.sinResultados = result.length === 0;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  verDetalle(id: string): void {
    this.router.navigate(['/workflow/politicas', id]);
  }
}

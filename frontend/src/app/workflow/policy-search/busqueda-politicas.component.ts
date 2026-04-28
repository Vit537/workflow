import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { PoliticaService } from '../../shared/services/politica.service';
import { Politica } from '../../shared/models/policy.model';

@Component({
  selector: 'app-busqueda-politicas',
  templateUrl: './busqueda-politicas.component.html',
  styleUrls: ['./busqueda-politicas.component.scss'],
  standalone: false,
})
export class BusquedaPoliticasComponent implements OnInit {
  busqueda = new FormControl('');
  politicas$!: Observable<Politica[]>;
  columnas = ['nombre', 'descripcion', 'creadoPor', 'acciones'];

  constructor(
    private politicaService: PoliticaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.politicas$ = this.busqueda.valueChanges.pipe(
      startWith(''),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((q) =>
        this.politicaService.buscarPoliticasPublicadas(q ?? '').pipe(
          catchError(() => of([]))
        )
      )
    );
  }

  verDetalle(id: string, politica: Politica): void {
    this.router.navigate(['/workflow/politicas', id], { state: { politicaResumen: politica } });
  }
}

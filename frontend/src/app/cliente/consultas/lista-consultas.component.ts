import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { ClienteConsultaService } from '../../shared/services/cliente-consulta.service';
import { Consulta, EstadoConsulta } from '../../shared/models/cliente.model';

@Component({
  selector: 'app-lista-consultas',
  templateUrl: './lista-consultas.component.html',
  styleUrls: ['./lista-consultas.component.scss'],
  standalone: false,
})
export class ListaConsultasComponent implements OnInit {
  consultas: Consulta[] = [];
  cargando = false;
  enviando = false;
  mostrarForm = false;
  descripcion = '';

  constructor(
    private servicio: ClienteConsultaService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.servicio.misConsultas().pipe(
      finalize(() => { this.cargando = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (c) => { this.consultas = c; },
      error: () => { this.snack.open('No se pudieron cargar las consultas.', 'Cerrar', { duration: 3000 }); },
    });
  }

  crear(): void {
    const texto = this.descripcion.trim();
    if (!texto) return;
    this.enviando = true;
    this.servicio.crearConsulta(texto).subscribe({
      next: () => {
        this.enviando = false;
        this.descripcion = '';
        this.mostrarForm = false;
        this.cdr.detectChanges();
        this.snack.open('Consulta enviada. Un asesor la revisará pronto.', 'Cerrar', { duration: 3000 });
        this.cargar();
      },
      error: () => {
        this.enviando = false;
        this.cdr.detectChanges();
        this.snack.open('No se pudo enviar la consulta.', 'Cerrar', { duration: 3000 });
      },
    });
  }

  abrir(c: Consulta): void {
    this.router.navigate(['/cliente/consultas', c.id]);
  }

  colorEstado(estado: EstadoConsulta): string {
    return estado === 'COMPLETADA' ? 'completada' : estado === 'EN_ATENCION' ? 'atencion' : 'pendiente';
  }

  textoEstado(estado: EstadoConsulta): string {
    return estado === 'COMPLETADA' ? 'Completada' : estado === 'EN_ATENCION' ? 'En atención' : 'Pendiente';
  }
}

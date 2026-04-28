import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ConsultaService, RespuestaVerificacion } from '../../shared/services/consulta.service';
import { Consulta } from '../../shared/models/consulta.model';
import { PoliticaService } from '../../shared/services/politica.service';
import { PoliticaResumen } from '../../shared/models/policy.model';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-detalle-consulta',
  templateUrl: './detalle-consulta.component.html',
  styleUrls: ['./detalle-consulta.component.scss'],
  standalone: false,
})
export class DetalleConsultaComponent implements OnInit {
  consulta: Consulta | null = null;
  cargando = true;
  enviando = false;
  error = '';
  exito = '';

  mensajeAsesor = '';
  politicaId = '';

  // Políticas publicadas para el selector
  politicas: PoliticaResumen[] = [];
  cargandoPoliticas = false;

  // Verificación de cliente
  verificando = false;
  correoVerificacion = '';
  descripcionVerificacion = '';
  resultadoVerificacion: RespuestaVerificacion | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private consultaService: ConsultaService,
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPoliticas();

    // Si venimos desde la lista, el objeto ya está en el state del router → no hay llamada HTTP
    const stateConsulta = history.state?.consulta as Consulta | undefined;
    if (stateConsulta?.id) {
      this.consulta = stateConsulta;
      this.mensajeAsesor = stateConsulta.mensajeAsesor ?? '';
      this.politicaId = '';
      this.correoVerificacion = stateConsulta.clienteCorreo ?? '';
      this.cargando = false;
      return;
    }

    // Fallback: navegación directa por URL → buscar en backend
    const id = this.route.snapshot.paramMap.get('id')!;
    this.consultaService.obtener(id).subscribe({
      next: (c) => {
        this.consulta = c;
        this.mensajeAsesor = c.mensajeAsesor ?? '';
        this.politicaId = '';
        this.correoVerificacion = c.clienteCorreo ?? '';
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la consulta';
        this.cargando = false;
      },
    });
  }

  private cargarPoliticas(): void {
    this.cargandoPoliticas = true;
    this.politicaService.listarPoliticas('PUBLICADA').subscribe({
      next: (ps) => { this.politicas = ps; this.cargandoPoliticas = false; },
      error: () => { this.cargandoPoliticas = false; },
    });
  }

  verificarCliente(): void {
    if (!this.correoVerificacion.trim()) return;
    this.verificando = true;
    this.resultadoVerificacion = null;
    this.consultaService.verificar(
      this.correoVerificacion.trim(),
      this.descripcionVerificacion.trim() || undefined
    ).subscribe({
      next: (r) => { this.resultadoVerificacion = r; this.verificando = false; },
      error: (err) => {
        this.verificando = false;
        this.error = err?.error?.mensaje ?? 'Error al verificar cliente';
      },
    });
  }

  atender(): void {
    if (!this.consulta || !this.mensajeAsesor.trim()) return;
    this.enviando = true;
    this.error = '';
    this.exito = '';
    const body: { mensajeAsesor: string; politicaId?: string } = {
      mensajeAsesor: this.mensajeAsesor,
    };
    if (this.politicaId.trim()) body.politicaId = this.politicaId.trim();

    this.consultaService.atender(this.consulta.id, body).pipe(timeout(15000)).subscribe({
      next: (actualizada) => {
        this.consulta = actualizada;
        this.exito = 'Consulta atendida y notificación enviada al cliente.';
        this.enviando = false;
        this.snackBar.open('✓ Consulta atendida. Notificación enviada al cliente.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        const msg = err instanceof TimeoutError
          ? 'Tiempo de espera agotado. Intenta de nuevo.'
          : (err?.error?.mensaje ?? 'Error al atender la consulta');
        this.error = msg;
        this.enviando = false;
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  completar(): void {
    if (!this.consulta) return;
    this.enviando = true;
    this.error = '';
    this.exito = '';
    this.consultaService.completar(this.consulta.id).pipe(timeout(15000)).subscribe({
      next: (actualizada) => {
        this.consulta = actualizada;
        this.exito = 'Consulta marcada como completada. Cliente notificado.';
        this.enviando = false;
        this.snackBar.open('✓ Consulta completada. Cliente notificado.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        const msg = err instanceof TimeoutError
          ? 'Tiempo de espera agotado. Intenta de nuevo.'
          : (err?.error?.mensaje ?? 'Error al completar la consulta');
        this.error = msg;
        this.enviando = false;
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/workflow/consultas']);
  }
}

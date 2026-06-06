Ahora agrego finalize a los servicios HTTP para que cargando SIEMPRE se ponga en false, sin importar si la respuesta fue exitosa o fallida:

Edit c:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\frontend\src\app\cliente\consultas\lista-consultas.component.ts

antes 

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteConsultaService } from '../../shared/services/cliente-consulta.service';
import { Consulta, EstadoConsulta } from '../../shared/models/cliente.model';

despues

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { ClienteConsultaService } from '../../shared/services/cliente-consulta.service';
import { Consulta, EstadoConsulta } from '../../shared/models/cliente.model';

Edit c:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\frontend\src\app\cliente\consultas\lista-consultas.component.ts

antes 

  cargar(): void {
    this.cargando = true;
    this.servicio.misConsultas().subscribe({
      next: (c) => { this.consultas = c; this.cargando = false; },
      error: () => { this.cargando = false; this.snack.open('No se pudieron cargar las consultas.', 'Cerrar', { duration: 3000 }); },
    });
  }

despues 

  cargar(): void {
    this.cargando = true;
    this.servicio.misConsultas().pipe(
      finalize(() => { this.cargando = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (c) => { this.consultas = c; },
      error: () => { this.snack.open('No se pudieron cargar las consultas.', 'Cerrar', { duration: 3000 }); },
    });
  }


  Ahora hago lo mismo en el componente de notificaciones:

Edit c:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\frontend\src\app\cliente\notificaciones\notificaciones.component.ts


antes 

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { Notificacion, TipoNotificacion } from '../../shared/models/cliente.model';

despues 

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { Notificacion, TipoNotificacion } from '../../shared/models/cliente.model';

Edit c:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\frontend\src\app\cliente\notificaciones\notificaciones.component.ts

antes 

  constructor(
    private servicio: NotificacionService,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

despues 

  constructor(
    private servicio: NotificacionService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

Edit c:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\frontend\src\app\cliente\notificaciones\notificaciones.component.ts

antes 
  cargar(): void {
    this.cargando = true;
    this.servicio.listar().subscribe({
      next: (n) => { this.notificaciones = n; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

despues 

  cargar(): void {
    this.cargando = true;
    this.servicio.listar().pipe(
      finalize(() => { this.cargando = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (n) => { this.notificaciones = n; },
      error: () => {},
    });
  }

  Tres cambios aplicados:

websocket.service.ts — El loop setTimeout(esperarConexion, 200) ahora corre fuera de Angular Zone con NgZone.runOutsideAngular(). Esto evita que dispare change detection cada 200ms y elimina la fuente del ExpressionChangedAfterItHasBeenCheckedError. Cuando llega un mensaje real, se usa zone.run() para re-entrar la zona y actualizar la vista correctamente.

lista-consultas.component.ts — Se usó el operador finalize() para garantizar que cargando = false y detectChanges() se ejecuten siempre, tanto si la petición tuvo éxito como si falló.

notificaciones.component.ts — Mismo patrón finalize() aplicado para que el spinner siempre desaparezca.
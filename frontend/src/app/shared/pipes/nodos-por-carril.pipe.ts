import { Pipe, PipeTransform } from '@angular/core';
import { Nodo } from '../models/policy.model';

@Pipe({ name: 'nodosPorCarril', standalone: false })
export class NodosPorCarrilPipe implements PipeTransform {
  transform(nodos: Nodo[], carrilId: string): Nodo[] {
    return nodos.filter(n => n.carrilId === carrilId);
  }
}

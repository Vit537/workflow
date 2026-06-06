import { Injectable } from '@angular/core';

declare global {
  interface Window {
    // La API del editor de OnlyOffice se inyecta en window al cargar api.js.
    DocsAPI?: any;
  }
}

/**
 * Carga (una sola vez) el script `api.js` del Document Server de OnlyOffice.
 *
 * <p>OnlyOffice no se instala vía npm: es un servicio externo que sirve su propia API JS. Este servicio
 * inyecta el `<script>` la primera vez que se necesita y resuelve cuando `window.DocsAPI` está disponible.</p>
 */
@Injectable({ providedIn: 'root' })
export class OnlyOfficeLoaderService {
  /** Promesa en curso por URL pública (evita inyectar el script más de una vez). */
  private cargaPorUrl = new Map<string, Promise<void>>();

  /** Tiempo máximo de espera a que el Document Server responda (ms). */
  private static readonly TIMEOUT_MS = 15000;

  /**
   * Garantiza que `window.DocsAPI` esté disponible cargando el api.js desde la URL pública dada.
   * @param publicUrl base del Document Server (ej. http://localhost:8082)
   */
  cargarApi(publicUrl: string): Promise<void> {
    if (window.DocsAPI) return Promise.resolve();

    const base = publicUrl.replace(/\/+$/, '');
    const existente = this.cargaPorUrl.get(base);
    if (existente) return existente;

    const promesa = new Promise<void>((resolve, reject) => {
      const src = `${base}/web-apps/apps/api/documents/api.js`;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      const timeout = setTimeout(() => {
        reject(new Error('El servidor de edición en línea no respondió a tiempo.'));
      }, OnlyOfficeLoaderService.TIMEOUT_MS);

      script.onload = () => {
        clearTimeout(timeout);
        if (window.DocsAPI) {
          resolve();
        } else {
          reject(new Error('No se pudo inicializar el editor en línea (DocsAPI no disponible).'));
        }
      };
      script.onerror = () => {
        clearTimeout(timeout);
        // Permitir reintentar más tarde si el servidor vuelve a estar disponible.
        this.cargaPorUrl.delete(base);
        reject(new Error('No se pudo conectar con el servidor de edición en línea.'));
      };

      document.body.appendChild(script);
    });

    this.cargaPorUrl.set(base, promesa);
    return promesa;
  }
}

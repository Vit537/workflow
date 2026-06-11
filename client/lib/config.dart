/// Configuración de la URL base del backend.
///
/// - Producción (Cloud Run): la URL desplegada.
/// - Desarrollo local: usa la IP del backend en tu PC.
///     * Emulador Android: http://10.0.2.2:8080  (10.0.2.2 = localhost del host)
///     * Dispositivo físico en la misma red: http://<IP-de-tu-PC>:8080
///
/// Cambia [apiBaseUrl] según dónde esté tu backend al probar.
///
/// Recuerda que para producción, debes desplegar tu backend (ej. en Cloud Run) y usar esa URL aquí.
// const String apiBaseUrl =
// 'https://spring-service-826923971440.us-central1.run.app';

// Para pruebas locales (emulador Android), usa: 'http://10.0.2.2:8080'
// Producción (AWS ALB):
const String apiBaseUrl = 'http://workflow-alb-1633866102.sa-east-1.elb.amazonaws.com';

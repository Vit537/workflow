import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config.dart';
import 'auth_service.dart';

/// Servicios de consultas del cliente autenticado.
class ConsultaService {
  /// Lista las consultas del cliente autenticado.
  static Future<List<Map<String, dynamic>>> misConsultas() async {
    final res = await http.get(
      Uri.parse('$apiBaseUrl/api/consultas/mias'),
      headers: AuthService.authHeader,
    );
    if (res.statusCode == 200) {
      return (jsonDecode(res.body) as List).cast<Map<String, dynamic>>();
    }
    throw Exception('Error al listar consultas: ${res.body}');
  }

  /// Crea una nueva consulta (solo descripción; los datos salen de la cuenta).
  static Future<Map<String, dynamic>> crearConsulta(String descripcion) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl/api/consultas'),
      headers: AuthService.jsonHeaders,
      body: jsonEncode({'descripcion': descripcion}),
    );
    if (res.statusCode == 201 || res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Error al crear consulta: ${res.body}');
  }

  /// Detalle de una consulta del cliente con el progreso del trámite.
  static Future<Map<String, dynamic>> detalle(String consultaId) async {
    final res = await http.get(
      Uri.parse('$apiBaseUrl/api/consultas/mias/$consultaId'),
      headers: AuthService.authHeader,
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Error al obtener consulta: ${res.body}');
  }

  /// Registra el token FCM del dispositivo (para notificaciones push).
  static Future<void> registrarFcmToken({
    required String consultaId,
    required String fcmToken,
  }) async {
    await http.post(
      Uri.parse('$apiBaseUrl/api/consultas/$consultaId/fcm-token'),
      headers: AuthService.jsonHeaders,
      body: jsonEncode({'fcmToken': fcmToken}),
    );
  }

  /// Envía los datos del formulario de un paso del trámite.
  static Future<void> enviarDatos({
    required String tramiteId,
    required String nodoId,
    required Map<String, dynamic> datos,
  }) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl/api/tramites/$tramiteId/pasos/$nodoId/datos-cliente'),
      headers: AuthService.jsonHeaders,
      body: jsonEncode(datos),
    );
    if (res.statusCode != 200) {
      throw Exception('Error al enviar datos: ${res.body}');
    }
  }

  /// Sube un archivo del cliente a un paso del trámite.
  static Future<void> subirArchivo({
    required String tramiteId,
    required String nodoId,
    required String campo,
    required File archivo,
  }) async {
    final uri = Uri.parse(
        '$apiBaseUrl/api/tramites/$tramiteId/pasos/$nodoId/archivos?campo=$campo');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(AuthService.authHeader);
    request.files.add(await http.MultipartFile.fromPath(
      'archivo',
      archivo.path,
      contentType: MediaType.parse(_detectarMime(archivo.path)),
    ));
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode != 200) {
      throw Exception('Error al subir archivo: ${response.body}');
    }
  }

  static String _detectarMime(String path) {
    final ext = path.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'xls':
      case 'xlsx':
        return 'application/vnd.ms-excel';
      default:
        return 'application/octet-stream';
    }
  }
}

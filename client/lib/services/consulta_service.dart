import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

/// URL base del backend.
/// En emulador Android usa 10.0.2.2 para alcanzar localhost del host.
/// En dispositivo físico en la misma red, reemplaza con la IP de tu PC.
const String _baseUrl = 'http://10.0.2.2:8080';

class ConsultaService {
  /// Crea una nueva consulta (endpoint público, sin JWT).
  static Future<Map<String, dynamic>> crearConsulta({
    required String clienteNombre,
    required String descripcion,
    String? clienteCorreo,
    String? clienteTelefono,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/consultas');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'clienteNombre': clienteNombre,
        'descripcion': descripcion,
        if (clienteCorreo != null && clienteCorreo.isNotEmpty)
          'clienteCorreo': clienteCorreo,
        if (clienteTelefono != null && clienteTelefono.isNotEmpty)
          'clienteTelefono': clienteTelefono,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Error al crear consulta: ${response.body}');
  }

  /// Registra el token FCM del dispositivo en la consulta creada.
  static Future<void> registrarFcmToken({
    required String consultaId,
    required String fcmToken,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/consultas/$consultaId/fcm-token');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'fcmToken': fcmToken}),
    );

    if (response.statusCode != 200) {
      throw Exception('Error al registrar token: ${response.body}');
    }
  }

  /// Consulta el estado actual de una consulta (endpoint público).
  static Future<Map<String, dynamic>> consultarEstado(String consultaId) async {
    final uri = Uri.parse('$_baseUrl/api/consultas/$consultaId/estado');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Error al consultar estado: ${response.body}');
  }

  /// Obtiene el paso activo actual del trámite asociado a la consulta.
  static Future<Map<String, dynamic>?> obtenerPasoActual(
      String consultaId) async {
    final uri = Uri.parse('$_baseUrl/api/consultas/$consultaId/paso-actual');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Error al obtener paso actual: ${response.body}');
  }

  /// Envía los datos de texto del formulario para un paso.
  static Future<Map<String, dynamic>> enviarDatosFormulario({
    required String tramiteId,
    required String nodoId,
    required Map<String, dynamic> datos,
  }) async {
    final uri = Uri.parse(
        '$_baseUrl/api/tramites/$tramiteId/pasos/$nodoId/datos-cliente');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(datos),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Error al enviar datos: ${response.body}');
  }

  /// Sube un archivo para un campo del formulario.
  static Future<Map<String, dynamic>> subirArchivo({
    required String tramiteId,
    required String nodoId,
    required String campo,
    required File archivo,
  }) async {
    final uri = Uri.parse(
        '$_baseUrl/api/tramites/$tramiteId/pasos/$nodoId/archivos?campo=$campo');

    final request = http.MultipartRequest('POST', uri);
    final mimeType = _detectarMime(archivo.path);
    request.files.add(await http.MultipartFile.fromPath(
      'archivo',
      archivo.path,
      contentType: MediaType.parse(mimeType),
    ));

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Error al subir archivo: ${response.body}');
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
      default:
        return 'application/octet-stream';
    }
  }
}

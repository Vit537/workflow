import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'auth_service.dart';

/// Mensajería de una consulta (cliente ↔ asesor).
class MensajeService {
  static Future<List<Map<String, dynamic>>> listar(String consultaId) async {
    final res = await http.get(
      Uri.parse('$apiBaseUrl/api/consultas/$consultaId/mensajes'),
      headers: AuthService.authHeader,
    );
    if (res.statusCode == 200) {
      return (jsonDecode(res.body) as List).cast<Map<String, dynamic>>();
    }
    throw Exception('Error al listar mensajes: ${res.body}');
  }

  static Future<Map<String, dynamic>> enviar(String consultaId, String texto) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl/api/consultas/$consultaId/mensajes'),
      headers: AuthService.jsonHeaders,
      body: jsonEncode({'texto': texto}),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Error al enviar mensaje: ${res.body}');
  }
}

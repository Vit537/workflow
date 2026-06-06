import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'auth_service.dart';

/// Notificaciones persistentes del usuario (la "campanita"): listar, marcar y eliminar.
class NotificacionService {
  static Future<List<Map<String, dynamic>>> listar() async {
    final res = await http.get(
      Uri.parse('$apiBaseUrl/api/notificaciones'),
      headers: AuthService.authHeader,
    );
    if (res.statusCode == 200) {
      return (jsonDecode(res.body) as List).cast<Map<String, dynamic>>();
    }
    throw Exception('Error al listar notificaciones: ${res.body}');
  }

  static Future<void> marcarLeida(String id) async {
    await http.patch(
      Uri.parse('$apiBaseUrl/api/notificaciones/$id/leer'),
      headers: AuthService.authHeader,
    );
  }

  static Future<void> marcarTodasLeidas() async {
    await http.patch(
      Uri.parse('$apiBaseUrl/api/notificaciones/leer-todas'),
      headers: AuthService.authHeader,
    );
  }

  static Future<void> eliminar(String id) async {
    await http.delete(
      Uri.parse('$apiBaseUrl/api/notificaciones/$id'),
      headers: AuthService.authHeader,
    );
  }
}

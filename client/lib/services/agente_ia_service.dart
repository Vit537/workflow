import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config.dart';
import 'auth_service.dart';

/// Agente automatizado de atención al cliente (IA): consulta por texto o por voz.
class AgenteIaService {
  /// Consulta por texto. `historial` = [{'role': 'user'|'assistant', 'content': '...'}].
  static Future<Map<String, dynamic>> consultar(
    String mensaje,
    List<Map<String, String>> historial,
  ) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl/api/agente/consulta'),
      headers: AuthService.jsonHeaders,
      body: jsonEncode({'mensaje': mensaje, 'historial': historial}),
    );
    if (res.statusCode == 200) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception('Error en la consulta IA: ${res.body}');
  }

  /// Consulta por voz: envía el audio grabado; el backend lo transcribe y responde.
  static Future<Map<String, dynamic>> consultarAudio(
    File audio,
    List<Map<String, String>> historial,
  ) async {
    final uri = Uri.parse('$apiBaseUrl/api/agente/consulta-audio');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(AuthService.authHeader);
    request.files.add(await http.MultipartFile.fromPath(
      'audio',
      audio.path,
      contentType: MediaType('audio', 'm4a'),
    ));
    request.fields['historial'] = jsonEncode(historial);

    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 200) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception('Error en la consulta por voz: ${res.body}');
  }
}

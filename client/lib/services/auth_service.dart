import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

/// Autenticación del cliente: registro, login, logout y almacenamiento del JWT.
/// El token se cachea en memoria tras [init] para construir cabeceras de forma síncrona.
class AuthService {
  static String? _token;
  static String? _userId;
  static String? _nombre;
  static String? _correo;

  static String? get token => _token;
  static String? get userId => _userId;
  static String? get nombre => _nombre;
  static String? get correo => _correo;
  static bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  /// Carga la sesión guardada al arrancar la app.
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    _userId = prefs.getString('userId');
    _nombre = prefs.getString('nombre');
    _correo = prefs.getString('correo');
  }

  static Map<String, String> get jsonHeaders => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  static Map<String, String> get authHeader => {
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  static Future<void> login(String correo, String contrasena) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'correo': correo, 'contrasena': contrasena}),
    );
    if (res.statusCode == 200) {
      await _guardarSesion(jsonDecode(res.body) as Map<String, dynamic>);
    } else {
      throw Exception('Correo o contraseña incorrectos');
    }
  }

  static Future<void> registrar({
    required String nombre,
    required String correo,
    required String contrasena,
    String? telefono,
  }) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl/api/auth/registro'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'nombre': nombre,
        'correo': correo,
        'contrasena': contrasena,
        if (telefono != null && telefono.isNotEmpty) 'telefono': telefono,
      }),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      await _guardarSesion(jsonDecode(res.body) as Map<String, dynamic>);
    } else {
      throw Exception('No se pudo crear la cuenta (¿el correo ya existe?)');
    }
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('userId');
    await prefs.remove('nombre');
    await prefs.remove('correo');
    _token = null;
    _userId = null;
    _nombre = null;
    _correo = null;
  }

  static Future<void> _guardarSesion(Map<String, dynamic> data) async {
    _token = data['token'] as String?;
    _userId = data['id'] as String?;
    _nombre = data['nombre'] as String?;
    _correo = data['correo'] as String?;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token ?? '');
    await prefs.setString('userId', _userId ?? '');
    await prefs.setString('nombre', _nombre ?? '');
    await prefs.setString('correo', _correo ?? '');
  }
}

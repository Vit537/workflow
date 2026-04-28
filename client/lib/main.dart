// ignore_for_file: avoid_print
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'firebase_options.dart';
import 'screens/nueva_consulta_screen.dart';
import 'screens/confirmacion_screen.dart';
import 'screens/notificaciones_screen.dart';
import 'screens/paso_actual_screen.dart';
import 'services/notification_service.dart';

/// Handler para mensajes recibidos en background (debe ser top-level)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  print('Mensaje en background: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Registrar handler de background
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Inicializar notificaciones locales
  await NotificationService.initialize();

  runApp(const ClienteWorkflowApp());
}

class ClienteWorkflowApp extends StatelessWidget {
  const ClienteWorkflowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Consultas',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1565C0)),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (ctx) => const NuevaConsultaScreen(),
        '/confirmacion': (ctx) => const ConfirmacionScreen(),
        '/notificaciones': (ctx) => const NotificacionesScreen(),
        '/paso-actual': (ctx) => const PasoActualScreen(),
      },
    );
  }
}

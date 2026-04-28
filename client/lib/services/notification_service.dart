// ignore_for_file: avoid_print
import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Canal de notificaciones para Android
const AndroidNotificationChannel _channel = AndroidNotificationChannel(
  'consultas_channel',
  'Consultas de Asesor',
  description: 'Notificaciones sobre el estado de tu consulta',
  importance: Importance.high,
);

final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

class NotificationService {
  /// Historial de mensajes recibidos durante la sesión (foreground + apertura desde background)
  static final List<RemoteMessage> mensajes = [];

  /// Stream que emite cada mensaje nuevo para actualizar la UI en tiempo real
  static final StreamController<RemoteMessage> _streamController =
      StreamController<RemoteMessage>.broadcast();

  static Stream<RemoteMessage> get stream => _streamController.stream;

  static Future<void> initialize() async {
    // Configuración Android
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);

    await _localNotifications.initialize(initSettings);

    // Crear canal de alta importancia en Android
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    // Solicitar permiso FCM
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Capturar el mensaje que abrió la app desde terminated/background
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      mensajes.insert(0, initial);
    }

    // Capturar mensajes cuando la app pasa de background a foreground
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      mensajes.insert(0, message);
      _streamController.add(message);
    });

    // Mostrar notificación local y guardar cuando la app está en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // Guardar en el store global
      mensajes.insert(0, message);
      _streamController.add(message);

      // Mostrar notificación del sistema
      final notification = message.notification;
      final android = message.notification?.android;
      if (notification != null && android != null) {
        _localNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              _channel.id,
              _channel.name,
              channelDescription: _channel.description,
              importance: Importance.high,
              priority: Priority.high,
            ),
          ),
        );
      }
    });
  }

  /// Obtiene el token FCM del dispositivo actual.
  static Future<String?> getFcmToken() async {
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (e) {
      print('Error obteniendo FCM token: $e');
      return null;
    }
  }
}

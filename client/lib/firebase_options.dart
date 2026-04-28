// ARCHIVO GENERADO AUTOMÁTICAMENTE POR `flutterfire configure`
//
// INSTRUCCIONES:
// 1. Ve a https://console.firebase.google.com
// 2. Selecciona el proyecto "notification-system-603aa"
// 3. Agrega una app Android con package name: com.workflow.cliente
// 4. Descarga el google-services.json y colócalo en client/android/app/
// 5. Instala flutterfire_cli: dart pub global activate flutterfire_cli
// 6. Ejecuta: flutterfire configure --project=notification-system-603aa
//    Esto reemplazará este archivo con los valores reales.
//
// VALORES DEL PROYECTO (de notification-system-603aa):
//   project_id: notification-system-603aa
//   messaging_sender_id: 826923971440
//   app_id (web): 1:826923971440:web:8a525ed63ad1760e7395b5

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions no están configuradas para esta plataforma. '
          'Ejecuta: flutterfire configure',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAyjMZlHfl5hU9QQ3gCKpnEPX6xiqk-JfA',
    appId: '1:826923971440:android:fd76144c291af8587395b5',
    messagingSenderId: '826923971440',
    projectId: 'notification-system-603aa',
    storageBucket: 'notification-system-603aa.firebasestorage.app',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAyjMZlHfl5hU9QQ3gCKpnEPX6xiqk-JfA',
    appId: '1:826923971440:web:8a525ed63ad1760e7395b5',
    messagingSenderId: '826923971440',
    projectId: 'notification-system-603aa',
    storageBucket: 'notification-system-603aa.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAyjMZlHfl5hU9QQ3gCKpnEPX6xiqk-JfA',
    appId: '1:826923971440:ios:fd76144c291af8587395b5',
    messagingSenderId: '826923971440',
    projectId: 'notification-system-603aa',
    storageBucket: 'notification-system-603aa.firebasestorage.app',
    iosBundleId: 'com.workflow.cliente',
  );
}

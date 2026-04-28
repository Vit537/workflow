import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../services/notification_service.dart';

class NotificacionesScreen extends StatefulWidget {
  const NotificacionesScreen({super.key});

  @override
  State<NotificacionesScreen> createState() => _NotificacionesScreenState();
}

class _NotificacionesScreenState extends State<NotificacionesScreen> {
  StreamSubscription<RemoteMessage>? _sub;

  @override
  void initState() {
    super.initState();
    // Suscribirse al stream global para refrescar cuando llegue un mensaje nuevo
    _sub = NotificationService.stream.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Leer siempre del store global — persiste aunque la pantalla se cierre y se reabra
    final mensajes = NotificationService.mensajes;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: mensajes.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'Aún no tienes notificaciones.\nCuando el asesor atienda tu\nconsulta, aparecerá aquí.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: mensajes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final m = mensajes[i];
                final titulo = m.notification?.title ?? 'Notificación';
                final cuerpo = m.notification?.body ?? '';
                final tipo = m.data['tipo'] ?? '';
                return Card(
                  color: tipo == 'COMPLETADA'
                      ? Colors.green.shade50
                      : Colors.blue.shade50,
                  child: ListTile(
                    leading: Icon(
                      tipo == 'COMPLETADA'
                          ? Icons.check_circle
                          : Icons.support_agent,
                      color: tipo == 'COMPLETADA' ? Colors.green : Colors.blue,
                    ),
                    title: Text(titulo,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(cuerpo),
                        const SizedBox(height: 4),
                        Text(
                          _formatearFecha(DateTime.now()),
                          style:
                              const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
    );
  }

  String _formatearFecha(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/'
        '${dt.year} '
        '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}';
  }
}

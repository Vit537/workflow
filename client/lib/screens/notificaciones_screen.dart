import 'package:flutter/material.dart';
import '../services/notificacion_service.dart';
import '../services/consulta_service.dart';
import 'detalle_consulta_screen.dart';

class NotificacionesScreen extends StatefulWidget {
  const NotificacionesScreen({super.key});

  @override
  State<NotificacionesScreen> createState() => _NotificacionesScreenState();
}

class _NotificacionesScreenState extends State<NotificacionesScreen> {
  List<Map<String, dynamic>> _notis = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final n = await NotificacionService.listar();
      if (mounted) setState(() { _notis = n; _cargando = false; });
    } catch (_) {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _abrir(Map<String, dynamic> n) async {
    if (n['leida'] != true) {
      await NotificacionService.marcarLeida(n['id'] as String);
      setState(() => n['leida'] = true);
    }
    final ref = n['referenciaId'] as String?;
    if (ref != null && mounted) {
      try {
        await ConsultaService.detalle(ref);
        if (mounted) {
          Navigator.push(context, MaterialPageRoute(
            builder: (_) => DetalleConsultaScreen(consultaId: ref),
          ));
        }
      } catch (_) {/* la referencia no es una consulta propia */}
    }
  }

  Future<void> _eliminar(Map<String, dynamic> n) async {
    await NotificacionService.eliminar(n['id'] as String);
    setState(() => _notis.removeWhere((x) => x['id'] == n['id']));
  }

  IconData _icono(String tipo) {
    switch (tipo) {
      case 'CONSULTA_ATENDIDA': return Icons.support_agent;
      case 'NUEVO_MENSAJE': return Icons.chat;
      case 'PASO_AVANZADO': return Icons.account_tree;
      case 'CONSULTA_COMPLETADA': return Icons.task_alt;
      default: return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hayNoLeidas = _notis.any((n) => n['leida'] != true);
    return Scaffold(
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (hayNoLeidas)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () async {
                        await NotificacionService.marcarTodasLeidas();
                        setState(() { for (final n in _notis) { n['leida'] = true; } });
                      },
                      icon: const Icon(Icons.done_all),
                      label: const Text('Marcar todas leídas'),
                    ),
                  ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _cargar,
                    child: _notis.isEmpty
                        ? ListView(children: const [
                            SizedBox(height: 120),
                            Icon(Icons.notifications_off, size: 56, color: Colors.black26),
                            SizedBox(height: 8),
                            Center(child: Text('No tienes notificaciones.',
                                style: TextStyle(color: Colors.black54))),
                          ])
                        : ListView.separated(
                            padding: const EdgeInsets.all(12),
                            itemCount: _notis.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 6),
                            itemBuilder: (ctx, i) {
                              final n = _notis[i];
                              final leida = n['leida'] == true;
                              return Card(
                                color: leida ? null : const Color(0xFFEEF2FF),
                                child: ListTile(
                                  leading: Icon(_icono(n['tipo'] as String? ?? ''),
                                      color: const Color(0xFF4F46E5)),
                                  title: Text(n['titulo'] as String? ?? '',
                                      style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text(n['cuerpo'] as String? ?? ''),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.delete_outline),
                                    onPressed: () => _eliminar(n),
                                  ),
                                  onTap: () => _abrir(n),
                                ),
                              );
                            },
                          ),
                  ),
                ),
              ],
            ),
    );
  }
}

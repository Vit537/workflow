import 'package:flutter/material.dart';
import '../services/consulta_service.dart';
import 'detalle_consulta_screen.dart';

class MisConsultasScreen extends StatefulWidget {
  const MisConsultasScreen({super.key});

  @override
  State<MisConsultasScreen> createState() => _MisConsultasScreenState();
}

class _MisConsultasScreenState extends State<MisConsultasScreen> {
  List<Map<String, dynamic>> _consultas = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final c = await ConsultaService.misConsultas();
      if (mounted) setState(() { _consultas = c; _cargando = false; });
    } catch (_) {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _nuevaConsulta() async {
    final controller = TextEditingController();
    final crear = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nueva consulta'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Describe tu consulta o el trámite que necesitas...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enviar')),
        ],
      ),
    );
    if (crear == true && controller.text.trim().isNotEmpty) {
      try {
        await ConsultaService.crearConsulta(controller.text.trim());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Consulta enviada. Un asesor la revisará pronto.')));
        }
        _cargar();
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No se pudo enviar la consulta.')));
        }
      }
    }
  }

  Color _color(String estado) {
    switch (estado) {
      case 'COMPLETADA': return const Color(0xFF16A34A);
      case 'EN_ATENCION': return const Color(0xFFCA8A04);
      default: return const Color(0xFFDC2626);
    }
  }

  String _texto(String estado) {
    switch (estado) {
      case 'COMPLETADA': return 'Completada';
      case 'EN_ATENCION': return 'En atención';
      default: return 'Pendiente';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _nuevaConsulta,
        icon: const Icon(Icons.add),
        label: const Text('Nueva consulta'),
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargar,
              child: _consultas.isEmpty
                  ? ListView(children: const [
                      SizedBox(height: 120),
                      Icon(Icons.inbox, size: 56, color: Colors.black26),
                      SizedBox(height: 8),
                      Center(child: Text('Todavía no tienes consultas.',
                          style: TextStyle(color: Colors.black54))),
                    ])
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _consultas.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (ctx, i) {
                        final c = _consultas[i];
                        final estado = c['estado'] as String? ?? 'PENDIENTE';
                        return Card(
                          child: ListTile(
                            title: Text(c['descripcion'] as String? ?? '',
                                maxLines: 2, overflow: TextOverflow.ellipsis),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Row(children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _color(estado).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(_texto(estado),
                                      style: TextStyle(color: _color(estado), fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 8),
                                if (c['tramiteId'] != null)
                                  const Text('Trámite en curso',
                                      style: TextStyle(fontSize: 11, color: Color(0xFF4F46E5))),
                              ]),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => Navigator.push(context, MaterialPageRoute(
                              builder: (_) => DetalleConsultaScreen(consultaId: c['id'] as String),
                            )).then((_) => _cargar()),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

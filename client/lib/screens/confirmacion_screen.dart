import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/consulta_service.dart';

class ConfirmacionScreen extends StatefulWidget {
  const ConfirmacionScreen({super.key});

  @override
  State<ConfirmacionScreen> createState() => _ConfirmacionScreenState();
}

class _ConfirmacionScreenState extends State<ConfirmacionScreen> {
  Map<String, dynamic>? _consulta;
  bool _cargando = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_consulta == null) {
      final args =
          ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null) {
        _consulta = args;
      }
    }
  }

  Future<void> _actualizarEstado() async {
    final id = _consulta?['consultaId'] as String?;
    if (id == null) return;
    setState(() => _cargando = true);
    try {
      final data = await ConsultaService.consultarEstado(id);
      setState(() {
        _consulta = {
          ..._consulta!,
          'estado': data['estado'],
          'mensajeAsesor': data['mensajeAsesor'],
          'tramiteId': data['tramiteId'],
        };
      });
    } catch (_) {
      // ignorar error de red silenciosamente
    } finally {
      setState(() => _cargando = false);
    }
  }

  String _etiquetaEstado(String? estado) {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente de revisión';
      case 'EN_ATENCION':
        return 'En atención';
      case 'COMPLETADA':
        return 'Completada';
      default:
        return 'Pendiente de revisión';
    }
  }

  Color _colorEstado(String? estado) {
    switch (estado) {
      case 'EN_ATENCION':
        return Colors.blue;
      case 'COMPLETADA':
        return Colors.green;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final consultaId = _consulta?['consultaId'] as String? ?? '';
    final nombre = _consulta?['clienteNombre'] as String? ?? '';
    final estado = _consulta?['estado'] as String?;
    final mensaje = _consulta?['mensajeAsesor'] as String?;
    final tramiteId = _consulta?['tramiteId'] as String?;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tu consulta fue enviada'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            tooltip: 'Notificaciones',
            onPressed: () => Navigator.pushNamed(context, '/notificaciones'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Ícono de éxito
            Center(
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle,
                    color: Colors.green, size: 48),
              ),
            ),
            const SizedBox(height: 20),
            Center(
              child: Text(
                '¡Hola, $nombre!',
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                'Tu consulta fue recibida exitosamente.\nUn asesor la revisará pronto.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ),
            const SizedBox(height: 24),

            // ID de consulta
            Card(
              child: ListTile(
                leading: const Icon(Icons.confirmation_number),
                title: const Text('ID de tu consulta'),
                subtitle: Text(
                  consultaId,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.copy),
                  tooltip: 'Copiar ID',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: consultaId));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('ID copiado')),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Estado actual
            Card(
              color: _colorEstado(estado).withOpacity(0.1),
              child: ListTile(
                leading: Icon(Icons.info_outline, color: _colorEstado(estado)),
                title: const Text('Estado'),
                subtitle: Text(
                  _etiquetaEstado(estado),
                  style: TextStyle(
                      color: _colorEstado(estado), fontWeight: FontWeight.bold),
                ),
              ),
            ),

            // Mensaje del asesor (si ya fue atendida)
            if (mensaje != null && mensaje.isNotEmpty) ...[
              const SizedBox(height: 12),
              Card(
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.support_agent, color: Colors.blue),
                          SizedBox(width: 8),
                          Text(
                            'Respuesta del asesor',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(mensaje),
                    ],
                  ),
                ),
              ),
            ],

            // Trámite iniciado — botón para ir al paso activo
            if (tramiteId != null && tramiteId.isNotEmpty) ...[
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.assignment, color: Colors.indigo),
                  title: const Text('Trámite iniciado'),
                  subtitle: Text(tramiteId,
                      style: const TextStyle(
                          fontFamily: 'monospace', fontSize: 12)),
                ),
              ),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/paso-actual',
                  arguments: {
                    'consultaId': consultaId,
                    'tramiteId': tramiteId,
                  },
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Ir a mi trámite'),
              ),
            ],

            const SizedBox(height: 24),

            // Botón actualizar estado
            OutlinedButton.icon(
              onPressed: _cargando ? null : _actualizarEstado,
              icon: _cargando
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh),
              label: Text(_cargando ? 'Actualizando...' : 'Actualizar estado'),
            ),
            const SizedBox(height: 12),

            // Botón nueva consulta
            TextButton.icon(
              onPressed: () => Navigator.pushReplacementNamed(context, '/'),
              icon: const Icon(Icons.add),
              label: const Text('Enviar otra consulta'),
            ),

            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                'Recibirás una notificación push cuando\nel asesor atienda tu consulta.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

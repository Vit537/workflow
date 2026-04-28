import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/consulta_service.dart';
import '../services/notification_service.dart';

class NuevaConsultaScreen extends StatefulWidget {
  const NuevaConsultaScreen({super.key});

  @override
  State<NuevaConsultaScreen> createState() => _NuevaConsultaScreenState();
}

class _NuevaConsultaScreenState extends State<NuevaConsultaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _correoCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _descripcionCtrl = TextEditingController();

  bool _enviando = false;
  String? _error;

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _correoCtrl.dispose();
    _telefonoCtrl.dispose();
    _descripcionCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviarConsulta() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _enviando = true;
      _error = null;
    });

    try {
      // 1. Crear la consulta en el backend
      final consulta = await ConsultaService.crearConsulta(
        clienteNombre: _nombreCtrl.text.trim(),
        descripcion: _descripcionCtrl.text.trim(),
        clienteCorreo: _correoCtrl.text.trim(),
        clienteTelefono: _telefonoCtrl.text.trim(),
      );

      final consultaId = consulta['id'] as String;

      // 2. Obtener FCM token y registrarlo
      final fcmToken = await NotificationService.getFcmToken();
      if (fcmToken != null) {
        await ConsultaService.registrarFcmToken(
          consultaId: consultaId,
          fcmToken: fcmToken,
        );
      }

      // 3. Guardar consultaId localmente para poder consultarlo después
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('consultaId', consultaId);
      await prefs.setString('clienteNombre', _nombreCtrl.text.trim());

      if (mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/confirmacion',
          arguments: {
            'consultaId': consultaId,
            'clienteNombre': _nombreCtrl.text.trim(),
          },
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Error al enviar la consulta. Verifica tu conexión.';
        _enviando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nueva Consulta'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            tooltip: 'Mis notificaciones',
            onPressed: () => Navigator.pushNamed(context, '/notificaciones'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                '¿En qué podemos ayudarte?',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Un asesor revisará tu consulta y te enviará una notificación con los pasos a seguir.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),

              // Nombre
              TextFormField(
                controller: _nombreCtrl,
                decoration: const InputDecoration(
                  labelText: 'Tu nombre *',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
                textCapitalization: TextCapitalization.words,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 16),

              // Correo
              TextFormField(
                controller: _correoCtrl,
                decoration: const InputDecoration(
                  labelText: 'Correo electrónico (opcional)',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),

              // Teléfono
              TextFormField(
                controller: _telefonoCtrl,
                decoration: const InputDecoration(
                  labelText: 'Teléfono (opcional)',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),

              // Descripción
              TextFormField(
                controller: _descripcionCtrl,
                decoration: const InputDecoration(
                  labelText: 'Describe tu consulta *',
                  prefixIcon: Icon(Icons.description),
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 5,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 24),

              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(_error!,
                      style: const TextStyle(color: Colors.red)),
                ),

              ElevatedButton.icon(
                onPressed: _enviando ? null : _enviarConsulta,
                icon: _enviando
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
                label:
                    Text(_enviando ? 'Enviando...' : 'Enviar consulta'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

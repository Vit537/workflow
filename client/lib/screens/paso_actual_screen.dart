// ignore_for_file: use_build_context_synchronously
import 'dart:async';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../services/consulta_service.dart';
import '../services/notification_service.dart';

/// Pantalla principal del flujo del cliente.
/// Muestra el paso activo del trámite y permite llenar el formulario.
class PasoActualScreen extends StatefulWidget {
  const PasoActualScreen({super.key});

  @override
  State<PasoActualScreen> createState() => _PasoActualScreenState();
}

class _PasoActualScreenState extends State<PasoActualScreen> {
  // Pasados como arguments desde ConfirmacionScreen
  String? _consultaId;
  String? _tramiteId;

  Map<String, dynamic>? _paso;
  bool _cargando = true;
  bool _enviando = false;
  String? _error;

  /// Suscripción al stream de notificaciones FCM para auto-refrescar el paso
  StreamSubscription<RemoteMessage>? _notifSub;

  // Controladores de texto por campo
  final Map<String, TextEditingController> _textControllers = {};
  // Valores booleanos por campo
  final Map<String, bool> _boolValues = {};
  // Archivos seleccionados por campo
  final Map<String, File> _archivosPendientes = {};
  // Archivos ya subidos (ruta relativa del servidor) por campo
  final Map<String, String> _archivosSubidos = {};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_consultaId == null) {
      final args =
          ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      _consultaId = args?['consultaId'] as String?;
      _tramiteId = args?['tramiteId'] as String?;
      _cargarPaso();

      // Escuchar notificaciones FCM en primer plano y refrescar el paso
      // automáticamente sin que el usuario tenga que pulsar el botón de actualizar
      _notifSub = NotificationService.stream.listen((_) {
        if (mounted) _cargarPaso();
      });
    }
  }

  Future<void> _cargarPaso() async {
    if (_consultaId == null) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final data = await ConsultaService.obtenerPasoActual(_consultaId!);
      if (data == null) {
        setState(() {
          _paso = null;
          _cargando = false;
        });
        return;
      }
      _inicializarControladores(data);
      setState(() {
        _paso = data;
        _cargando = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _inicializarControladores(Map<String, dynamic> paso) {
    final campos = _obtenerCampos(paso);
    final datosEnviados =
        (paso['datosEnviados'] as Map<String, dynamic>?) ?? {};

    for (final campo in campos) {
      final nombre = campo['nombre'] as String;
      final tipo = campo['tipo'] as String? ?? 'TEXTO';
      final valorPrevio = datosEnviados[nombre];

      if (tipo == 'BOOLEANO') {
        _boolValues[nombre] = (valorPrevio == true || valorPrevio == 'true');
      } else if (tipo == 'ARCHIVO') {
        if (valorPrevio != null) {
          _archivosSubidos[nombre] = valorPrevio.toString();
        }
      } else {
        _textControllers.putIfAbsent(
          nombre,
          () => TextEditingController(text: valorPrevio?.toString() ?? ''),
        );
      }
    }
  }

  List<Map<String, dynamic>> _obtenerCampos(Map<String, dynamic> paso) {
    final formulario = paso['formulario'] as Map<String, dynamic>?;
    if (formulario == null) return [];
    final campos = formulario['campos'] as List<dynamic>?;
    if (campos == null) return [];
    return campos.cast<Map<String, dynamic>>();
  }

  Future<void> _seleccionarArchivo(String campo) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
    );
    if (result != null && result.files.single.path != null) {
      setState(() {
        _archivosPendientes[campo] = File(result.files.single.path!);
      });
    }
  }

  Future<void> _tomarFoto(String campo) async {
    final picker = ImagePicker();
    final XFile? foto =
        await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (foto != null) {
      setState(() {
        _archivosPendientes[campo] = File(foto.path);
      });
    }
  }

  Future<void> _enviarFormulario() async {
    if (_tramiteId == null || _paso == null) return;

    final nodoId = _paso!['nodoId'] as String? ?? '';

    if (nodoId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo identificar el paso activo')),
      );
      return;
    }

    setState(() => _enviando = true);

    try {
      // 1. Subir archivos pendientes primero
      for (final entry in _archivosPendientes.entries) {
        await ConsultaService.subirArchivo(
          tramiteId: _tramiteId!,
          nodoId: nodoId,
          campo: entry.key,
          archivo: entry.value,
        );
        _archivosSubidos[entry.key] = 'subido';
      }
      _archivosPendientes.clear();

      // 2. Recopilar datos de texto y booleanos
      final Map<String, dynamic> datos = {};
      for (final entry in _textControllers.entries) {
        if (entry.value.text.isNotEmpty) {
          datos[entry.key] = entry.value.text;
        }
      }
      for (final entry in _boolValues.entries) {
        datos[entry.key] = entry.value;
      }

      if (datos.isNotEmpty) {
        await ConsultaService.enviarDatosFormulario(
          tramiteId: _tramiteId!,
          nodoId: nodoId,
          datos: datos,
        );
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Datos enviados correctamente'),
          backgroundColor: Colors.green,
        ),
      );

      // Recargar el paso para ver el estado actualizado
      await _cargarPaso();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _enviando = false);
    }
  }

  @override
  void dispose() {
    _notifSub?.cancel();
    for (final c in _textControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  // ─────────────────── UI ───────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi trámite'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: _cargando ? null : _cargarPaso,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _cargarPaso,
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    if (_paso == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.hourglass_empty, size: 48, color: Colors.grey),
              SizedBox(height: 12),
              Text(
                'Tu consulta está siendo revisada.\nUn asesor la atenderá pronto.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    final tramiteCompletado = _paso!['tramiteCompletado'] == true;

    if (tramiteCompletado) {
      return _buildTramiteCompletado();
    }

    return _buildFormulario();
  }

  Widget _buildTramiteCompletado() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                shape: BoxShape.circle,
              ),
              child:
                  const Icon(Icons.check_circle, color: Colors.green, size: 64),
            ),
            const SizedBox(height: 24),
            const Text(
              '¡Trámite completado!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Todos los pasos han sido procesados.\nTe notificaremos el resultado.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormulario() {
    final departamento = _paso!['departamento'] as String? ?? '';
    final actividad = _paso!['actividad'] as String? ?? '';
    final pasoNum = _paso!['pasoActualNumero'] as int? ?? 1;
    final totalPasos = _paso!['totalPasos'] as int? ?? 1;
    final campos = _obtenerCampos(_paso!);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Progreso
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Paso $pasoNum de $totalPasos',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Chip(
                        label: Text(departamento),
                        backgroundColor:
                            Theme.of(context).colorScheme.primaryContainer,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: totalPasos > 0 ? pasoNum / totalPasos : 0,
                    backgroundColor: Colors.grey.shade200,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    actividad,
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Campos del formulario
          if (campos.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Este paso no requiere datos adicionales de tu parte.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          else ...[
            const Text(
              'Completa la siguiente información:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 12),
            ...campos.map((campo) => _buildCampo(campo)),
          ],

          const SizedBox(height: 24),

          // Botón enviar
          ElevatedButton.icon(
            onPressed: _enviando ? null : _enviarFormulario,
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: _enviando
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.send),
            label: Text(_enviando ? 'Enviando...' : 'Enviar información'),
          ),
        ],
      ),
    );
  }

  Widget _buildCampo(Map<String, dynamic> campo) {
    final nombre = campo['nombre'] as String;
    final etiqueta = campo['etiqueta'] as String? ?? nombre;
    final tipo = campo['tipo'] as String? ?? 'TEXTO';
    final requerido = campo['requerido'] == true;
    final opciones =
        (campo['opciones'] as List<dynamic>?)?.cast<String>() ?? [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: switch (tipo) {
        'BOOLEANO' => _buildBoolCampo(nombre, etiqueta),
        'ARCHIVO' => _buildArchivoCampo(nombre, etiqueta),
        'SELECCION' =>
          _buildSeleccionCampo(nombre, etiqueta, opciones, requerido),
        'NUMERO' => _buildTextoCampo(nombre, etiqueta, requerido,
            inputType: TextInputType.number),
        'FECHA' => _buildFechaCampo(nombre, etiqueta, requerido),
        _ => _buildTextoCampo(nombre, etiqueta, requerido),
      },
    );
  }

  Widget _buildTextoCampo(String nombre, String etiqueta, bool requerido,
      {TextInputType inputType = TextInputType.text}) {
    _textControllers.putIfAbsent(nombre, () => TextEditingController());
    return TextFormField(
      controller: _textControllers[nombre],
      keyboardType: inputType,
      decoration: InputDecoration(
        labelText: requerido ? '$etiqueta *' : etiqueta,
        border: const OutlineInputBorder(),
      ),
    );
  }

  Widget _buildFechaCampo(String nombre, String etiqueta, bool requerido) {
    _textControllers.putIfAbsent(nombre, () => TextEditingController());
    return TextFormField(
      controller: _textControllers[nombre],
      readOnly: true,
      decoration: InputDecoration(
        labelText: requerido ? '$etiqueta *' : etiqueta,
        border: const OutlineInputBorder(),
        suffixIcon: const Icon(Icons.calendar_today),
      ),
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime(2099),
        );
        if (picked != null) {
          _textControllers[nombre]!.text =
              '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
        }
      },
    );
  }

  Widget _buildBoolCampo(String nombre, String etiqueta) {
    _boolValues.putIfAbsent(nombre, () => false);
    return Card(
      child: SwitchListTile(
        title: Text(etiqueta),
        value: _boolValues[nombre]!,
        onChanged: (v) => setState(() => _boolValues[nombre] = v),
      ),
    );
  }

  Widget _buildSeleccionCampo(
      String nombre, String etiqueta, List<String> opciones, bool requerido) {
    _textControllers.putIfAbsent(nombre, () => TextEditingController());
    final valorActual = _textControllers[nombre]!.text.isEmpty
        ? null
        : _textControllers[nombre]!.text;

    return DropdownButtonFormField<String>(
      value: opciones.contains(valorActual) ? valorActual : null,
      decoration: InputDecoration(
        labelText: requerido ? '$etiqueta *' : etiqueta,
        border: const OutlineInputBorder(),
      ),
      items: opciones
          .map((o) => DropdownMenuItem(value: o, child: Text(o)))
          .toList(),
      onChanged: (v) {
        if (v != null) _textControllers[nombre]!.text = v;
      },
    );
  }

  Widget _buildArchivoCampo(String nombre, String etiqueta) {
    final archivoPendiente = _archivosPendientes[nombre];
    final archivoSubido = _archivosSubidos[nombre];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(etiqueta, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (archivoSubido != null && archivoPendiente == null)
              Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 18),
                  const SizedBox(width: 6),
                  const Text('Archivo enviado',
                      style: TextStyle(color: Colors.green)),
                ],
              ),
            if (archivoPendiente != null)
              Row(
                children: [
                  const Icon(Icons.attach_file, color: Colors.blue, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      archivoPendiente.path.split('/').last,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.blue),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _tomarFoto(nombre),
                    icon: const Icon(Icons.camera_alt, size: 18),
                    label: const Text('Cámara'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _seleccionarArchivo(nombre),
                    icon: const Icon(Icons.folder_open, size: 18),
                    label: const Text('Galería/Archivo'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

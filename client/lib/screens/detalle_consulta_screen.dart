import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/consulta_service.dart';
import '../services/mensaje_service.dart';

class DetalleConsultaScreen extends StatefulWidget {
  final String consultaId;
  const DetalleConsultaScreen({super.key, required this.consultaId});

  @override
  State<DetalleConsultaScreen> createState() => _DetalleConsultaScreenState();
}

class _DetalleConsultaScreenState extends State<DetalleConsultaScreen> {
  Map<String, dynamic>? _detalle;
  bool _cargando = true;
  bool _subiendo = false;
  bool _enviandoDatos = false;

  /// Valores que el cliente escribe en el formulario del paso actual.
  final Map<String, dynamic> _datosForm = {};

  List<Map<String, dynamic>> _mensajes = [];
  final _msgController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cargar();
    _cargarMensajes();
  }

  Future<void> _cargar() async {
    try {
      final d = await ConsultaService.detalle(widget.consultaId);
      if (mounted) setState(() { _detalle = d; _cargando = false; });
    } catch (_) {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _cargarMensajes() async {
    try {
      final m = await MensajeService.listar(widget.consultaId);
      if (mounted) setState(() => _mensajes = m);
    } catch (_) {}
  }

  List<Map<String, dynamic>> get _pasos {
    final tramite = _detalle?['tramite'] as Map<String, dynamic>?;
    return ((tramite?['pasos'] as List?) ?? []).cast<Map<String, dynamic>>();
  }

  Map<String, dynamic>? get _pasoActual {
    for (final p in _pasos) {
      if (p['estado'] != 'COMPLETADO') return p;
    }
    return null;
  }

  Future<void> _subirArchivo() async {
    final tramiteId = _detalle?['tramiteId'] as String?;
    final paso = _pasoActual;
    if (tramiteId == null || paso == null) return;

    final result = await FilePicker.platform.pickFiles();
    if (result == null || result.files.single.path == null) return;

    // Usa el primer campo de tipo ARCHIVO si existe; si no, "documento".
    final campos = (paso['formulario']?['campos'] as List?) ?? [];
    final campoArchivo = campos
        .cast<Map<String, dynamic>>()
        .firstWhere((c) => c['tipoCampo'] == 'ARCHIVO', orElse: () => {})['nombre'] as String? ?? 'documento';

    setState(() => _subiendo = true);
    try {
      await ConsultaService.subirArchivo(
        tramiteId: tramiteId,
        nodoId: paso['nodoId'] as String,
        campo: campoArchivo,
        archivo: File(result.files.single.path!),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Archivo enviado al asesor.')));
      }
      _cargar();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo subir el archivo.')));
      }
    } finally {
      if (mounted) setState(() => _subiendo = false);
    }
  }

  Map<String, dynamic>? get _formularioActual =>
      _pasoActual?['formulario'] as Map<String, dynamic>?;

  /// El paso actual pide subir documentos solo si el admin lo configuró.
  bool get _requiereDocumentos => _formularioActual?['requiereDocumentos'] == true;

  /// Campos del formulario que no son de tipo ARCHIVO (esos van por la subida).
  List<Map<String, dynamic>> get _camposFormulario {
    final campos = (_formularioActual?['campos'] as List?) ?? [];
    return campos
        .cast<Map<String, dynamic>>()
        .where((c) => c['tipoCampo'] != 'ARCHIVO')
        .toList();
  }

  Future<void> _enviarDatos() async {
    final tramiteId = _detalle?['tramiteId'] as String?;
    final paso = _pasoActual;
    if (tramiteId == null || paso == null) return;

    setState(() => _enviandoDatos = true);
    try {
      await ConsultaService.enviarDatos(
        tramiteId: tramiteId,
        nodoId: paso['nodoId'] as String,
        datos: _datosForm,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Datos enviados al asesor.')));
      }
      _cargar();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudieron enviar los datos.')));
      }
    } finally {
      if (mounted) setState(() => _enviandoDatos = false);
    }
  }

  Future<void> _enviarMensaje() async {
    final texto = _msgController.text.trim();
    if (texto.isEmpty) return;
    try {
      final m = await MensajeService.enviar(widget.consultaId, texto);
      if (mounted) setState(() { _mensajes = [..._mensajes, m]; _msgController.clear(); });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Detalle de la consulta'),
          bottom: const TabBar(tabs: [
            Tab(text: 'Progreso'),
            Tab(text: 'Mensajes'),
          ]),
        ),
        body: _cargando
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(children: [_progreso(), _chat()]),
      ),
    );
  }

  Widget _progreso() {
    final mensajeAsesor = _detalle?['mensajeAsesor'] as String?;
    final tramite = _detalle?['tramite'] as Map<String, dynamic>?;
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(_detalle?['descripcion'] as String? ?? '',
              style: const TextStyle(fontSize: 15)),
          if (mensajeAsesor != null) ...[
            const SizedBox(height: 12),
            Card(
              color: const Color(0xFFEEF2FF),
              child: ListTile(
                leading: const Icon(Icons.support_agent, color: Color(0xFF4F46E5)),
                title: const Text('Mensaje del asesor', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(mensajeAsesor),
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (tramite == null)
            const Card(
              child: ListTile(
                leading: Icon(Icons.hourglass_top, color: Colors.orange),
                title: Text('En revisión'),
                subtitle: Text('Tu consulta está siendo revisada. Cuando inicie tu trámite verás los pasos a seguir.'),
              ),
            )
          else ...[
            Text(tramite['nombrePolitica'] as String? ?? 'Trámite',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._pasos.map(_filaPaso),
            const SizedBox(height: 16),

            // Formulario del paso actual (solo si tiene uno configurado)
            if (_pasoActual != null && _formularioActual != null) _formularioPaso(),

            // Subida de archivos: SOLO si el admin lo configuró en este paso
            if (_pasoActual != null && _requiereDocumentos) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _subiendo ? null : _subirArchivo,
                  icon: _subiendo
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.upload_file),
                  label: Text(_subiendo
                      ? 'Subiendo...'
                      : 'Subir archivo para «${_pasoActual!['etiquetaNodo']}»'),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _formularioPaso() {
    final form = _formularioActual!;
    final titulo = form['titulo'] as String?;
    final instrucciones = form['instrucciones'] as String?;
    final requisitos = (form['requisitos'] as List?)?.cast<String>() ?? [];

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (titulo != null && titulo.isNotEmpty)
            Text(titulo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          if (instrucciones != null && instrucciones.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(instrucciones, style: const TextStyle(color: Color(0xFF475569))),
          ],
          if (requisitos.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...requisitos.map((r) => Row(children: [
                  const Icon(Icons.check, size: 18, color: Color(0xFF16A34A)),
                  const SizedBox(width: 6),
                  Expanded(child: Text(r)),
                ])),
          ],
          const SizedBox(height: 8),
          ..._camposFormulario.map(_campoWidget),
          if (_camposFormulario.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _enviandoDatos ? null : _enviarDatos,
                icon: _enviandoDatos
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
                label: Text(_enviandoDatos ? 'Enviando...' : 'Enviar datos'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _campoWidget(Map<String, dynamic> c) {
    final nombre = c['nombre'] as String;
    final etiqueta = (c['etiqueta'] as String? ?? nombre) + (c['requerido'] == true ? ' *' : '');
    final tipo = c['tipoCampo'] as String?;

    if (tipo == 'BOOLEANO') {
      return SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(etiqueta),
        value: _datosForm[nombre] == true,
        onChanged: (v) => setState(() => _datosForm[nombre] = v),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: TextField(
        keyboardType: tipo == 'NUMERO' ? TextInputType.number : TextInputType.text,
        decoration: InputDecoration(
          labelText: etiqueta,
          border: const OutlineInputBorder(),
          isDense: true,
        ),
        onChanged: (v) => _datosForm[nombre] = v,
      ),
    );
  }

  Widget _filaPaso(Map<String, dynamic> p) {
    final hecho = p['estado'] == 'COMPLETADO';
    final actual = identical(p, _pasoActual);
    return ListTile(
      leading: Icon(
        hecho ? Icons.check_circle : (actual ? Icons.radio_button_checked : Icons.radio_button_unchecked),
        color: hecho ? Colors.green : (actual ? const Color(0xFF4F46E5) : Colors.black26),
      ),
      title: Text(p['etiquetaNodo'] as String? ?? ''),
      subtitle: Text('${p['carrilNombre'] ?? ''} · ${hecho ? 'Hecho' : (actual ? 'En curso' : 'Pendiente')}'),
    );
  }

  Widget _chat() {
    final miId = AuthService.userId;
    return Column(
      children: [
        Expanded(
          child: _mensajes.isEmpty
              ? const Center(child: Text('Aún no hay mensajes. Escribe tu duda al asesor.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _mensajes.length,
                  itemBuilder: (ctx, i) {
                    final m = _mensajes[i];
                    final mio = m['autorId'] == miId;
                    return Align(
                      alignment: mio ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        constraints: const BoxConstraints(maxWidth: 280),
                        decoration: BoxDecoration(
                          color: mio ? const Color(0xFF4F46E5) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(mio ? 'Tú' : (m['autorNombre'] as String? ?? ''),
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold,
                                    color: mio ? Colors.white70 : Colors.black54)),
                            Text(m['texto'] as String? ?? '',
                                style: TextStyle(color: mio ? Colors.white : Colors.black87)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Row(children: [
              IconButton(icon: const Icon(Icons.refresh), onPressed: _cargarMensajes),
              Expanded(
                child: TextField(
                  controller: _msgController,
                  decoration: const InputDecoration(
                    hintText: 'Escribe un mensaje',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.send, color: Color(0xFF4F46E5)),
                onPressed: _enviarMensaje,
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import '../services/agente_ia_service.dart';
import '../services/consulta_service.dart';

class _Burbuja {
  final String role; // 'user' | 'assistant'
  final String texto;
  final bool sugiereAsesor;
  final String? recomendacion;
  _Burbuja(this.role, this.texto, {this.sugiereAsesor = false, this.recomendacion});
}

class AsistenteIaScreen extends StatefulWidget {
  const AsistenteIaScreen({super.key});

  @override
  State<AsistenteIaScreen> createState() => _AsistenteIaScreenState();
}

class _AsistenteIaScreenState extends State<AsistenteIaScreen> {
  final List<_Burbuja> _mensajes = [
    _Burbuja('assistant',
        'Hola, soy el asistente virtual. Cuéntame qué necesitas y te recomendaré el trámite adecuado. También puedes hablar con un asesor.'),
  ];
  final _ejemplos = const [
    'Quiero abrir una cuenta de ahorros',
    'Necesito solicitar un préstamo',
    'Tengo un cobro que no reconozco en mi tarjeta',
    'Quiero contratar un seguro',
  ];

  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final AudioRecorder _rec = AudioRecorder();

  bool _cargando = false;
  bool _grabando = false;
  bool _derivando = false;

  @override
  void dispose() {
    _rec.dispose();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  List<Map<String, String>> _historial() => _mensajes
      .map((m) => {'role': m.role, 'content': m.texto})
      .toList()
      .reversed
      .take(8)
      .toList()
      .reversed
      .toList();

  void _scrollAbajo() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _enviarTexto([String? ejemplo]) async {
    final texto = (ejemplo ?? _controller.text).trim();
    if (texto.isEmpty || _cargando) return;
    final historial = _historial();
    setState(() {
      _mensajes.add(_Burbuja('user', texto));
      _controller.clear();
      _cargando = true;
    });
    _scrollAbajo();
    try {
      final r = await AgenteIaService.consultar(texto, historial);
      _agregarRespuesta(r);
    } catch (_) {
      setState(() => _mensajes.add(_Burbuja('assistant',
          'Ocurrió un error. Intenta de nuevo o solicita un asesor.', sugiereAsesor: true)));
    } finally {
      if (mounted) setState(() => _cargando = false);
      _scrollAbajo();
    }
  }

  void _agregarRespuesta(Map<String, dynamic> r) {
    final rec = r['recomendacion'];
    setState(() => _mensajes.add(_Burbuja(
          'assistant',
          (r['respuesta'] as String?) ?? '',
          sugiereAsesor: (r['sugiereAsesor'] as bool?) ?? false,
          recomendacion: rec is Map ? rec['nombre'] as String? : null,
        )));
  }

  // ── Voz ──
  Future<void> _toggleGrabacion() async {
    if (_cargando) return;
    if (_grabando) {
      await _detener();
    } else {
      await _iniciar();
    }
  }

  Future<void> _iniciar() async {
    if (!await _rec.hasPermission()) {
      _snack('No se concedió permiso para el micrófono.');
      return;
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/consulta_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _rec.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path);
    setState(() => _grabando = true);
  }

  Future<void> _detener() async {
    final path = await _rec.stop();
    setState(() => _grabando = false);
    if (path == null) return;
    final historial = _historial();
    setState(() => _cargando = true);
    try {
      final r = await AgenteIaService.consultarAudio(File(path), historial);
      final transcrito = r['promptTranscrito'] as String?;
      if (transcrito != null && transcrito.isNotEmpty) {
        setState(() => _mensajes.add(_Burbuja('user', transcrito)));
      }
      _agregarRespuesta(r);
    } catch (_) {
      setState(() => _mensajes.add(_Burbuja('assistant',
          'No se pudo procesar el audio. Intenta de nuevo o escribe tu consulta.', sugiereAsesor: true)));
    } finally {
      if (mounted) setState(() => _cargando = false);
      _scrollAbajo();
    }
  }

  Future<void> _derivarAsesor() async {
    if (_derivando) return;
    final texto = _mensajes.where((m) => m.role == 'user').map((m) => m.texto).join(' | ');
    setState(() => _derivando = true);
    try {
      await ConsultaService.crearConsulta(texto.isEmpty ? 'Consulta desde el asistente IA' : texto);
      if (mounted) {
        _snack('Te derivamos con un asesor. Verás la consulta en tu lista.');
        Navigator.pop(context);
      }
    } catch (_) {
      _snack('No se pudo crear la consulta con el asesor.');
    } finally {
      if (mounted) setState(() => _derivando = false);
    }
  }

  void _snack(String m) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Asistente IA')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.all(12),
              children: [
                ..._mensajes.map(_burbuja),
                if (_mensajes.length <= 1) _chipsEjemplos(),
                if (_cargando)
                  const Padding(
                    padding: EdgeInsets.all(8),
                    child: Row(children: [
                      SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                      SizedBox(width: 8),
                      Text('Escribiendo…', style: TextStyle(color: Colors.black54)),
                    ]),
                  ),
              ],
            ),
          ),
          if (_grabando)
            Container(
              width: double.infinity,
              color: const Color(0xFFFDECEA),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: const Text('● Grabando… presiona el botón rojo para enviar.',
                  style: TextStyle(color: Color(0xFFC5221F))),
            ),
          _barraEntrada(),
        ],
      ),
    );
  }

  Widget _chipsEjemplos() {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _ejemplos
            .map((e) => ActionChip(label: Text(e), onPressed: () => _enviarTexto(e)))
            .toList(),
      ),
    );
  }

  Widget _burbuja(_Burbuja m) {
    final esUser = m.role == 'user';
    return Align(
      alignment: esUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        decoration: BoxDecoration(
          color: esUser ? const Color(0xFF1A73E8) : const Color(0xFFF1F3F4),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(m.texto, style: TextStyle(color: esUser ? Colors.white : Colors.black87)),
            if (m.recomendacion != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('Trámite sugerido: ${m.recomendacion}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1F3A5F))),
              ),
            if (m.sugiereAsesor)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: FilledButton.icon(
                  onPressed: _derivando ? null : _derivarAsesor,
                  icon: const Icon(Icons.support_agent),
                  label: const Text('Hablar con un asesor'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _barraEntrada() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _controller,
              enabled: !_cargando && !_grabando,
              decoration: const InputDecoration(
                hintText: 'Escribe tu consulta…',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onSubmitted: (_) => _enviarTexto(),
            ),
          ),
          IconButton(
            onPressed: _cargando ? null : _toggleGrabacion,
            icon: Icon(_grabando ? Icons.stop : Icons.mic),
            color: _grabando ? const Color(0xFFC5221F) : const Color(0xFF1A73E8),
            tooltip: 'Consultar por voz',
          ),
          IconButton.filled(
            onPressed: (_cargando || _grabando) ? null : () => _enviarTexto(),
            icon: const Icon(Icons.send),
          ),
        ]),
      ),
    );
  }
}

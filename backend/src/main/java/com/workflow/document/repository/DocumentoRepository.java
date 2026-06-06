package com.workflow.document.repository;

import com.workflow.document.model.Documento;
import com.workflow.document.model.EstadoDocumento;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DocumentoRepository extends MongoRepository<Documento, String> {

  List<Documento> findByPoliticaIdOrderByActualizadoEnDesc(String politicaId);

  List<Documento> findByPoliticaIdAndEstadoOrderByActualizadoEnDesc(String politicaId, EstadoDocumento estado);

  List<Documento> findByPoliticaIdAndNodoIdOrderByActualizadoEnDesc(String politicaId, String nodoId);

  List<Documento> findByTramiteId(String tramiteId);
}

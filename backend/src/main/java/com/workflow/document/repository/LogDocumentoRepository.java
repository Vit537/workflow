package com.workflow.document.repository;

import com.workflow.document.model.LogDocumento;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LogDocumentoRepository extends MongoRepository<LogDocumento, String> {

  List<LogDocumento> findByDocumentoIdOrderByFechaDesc(String documentoId);

  List<LogDocumento> findByPoliticaIdOrderByFechaDesc(String politicaId);
}

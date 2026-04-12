package com.workflow.execution.repository;

import com.workflow.execution.model.EstadoTramite;
import com.workflow.execution.model.Tramite;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TramiteRepository extends MongoRepository<Tramite, String> {

  List<Tramite> findByEstado(EstadoTramite estado);

  List<Tramite> findByIniciadoPor(String correo);

  List<Tramite> findByPoliticaId(String politicaId);
}

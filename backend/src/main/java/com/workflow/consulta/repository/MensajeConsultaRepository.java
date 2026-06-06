package com.workflow.consulta.repository;

import com.workflow.consulta.model.MensajeConsulta;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MensajeConsultaRepository extends MongoRepository<MensajeConsulta, String> {

  List<MensajeConsulta> findByConsultaIdOrderByFechaAsc(String consultaId);
}

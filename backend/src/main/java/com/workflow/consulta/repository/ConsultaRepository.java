package com.workflow.consulta.repository;

import com.workflow.consulta.model.Consulta;
import com.workflow.consulta.model.EstadoConsulta;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConsultaRepository extends MongoRepository<Consulta, String> {

  List<Consulta> findByEstado(EstadoConsulta estado);

  List<Consulta> findByEstadoOrderByCreadaEnDesc(EstadoConsulta estado);

  List<Consulta> findAllByOrderByCreadaEnDesc();

  /** Busca la consulta vinculada a un trámite concreto. */
  java.util.Optional<Consulta> findByTramiteId(String tramiteId);

  /** Busca la consulta más reciente por correo (usa índice) — más eficiente que cargar la lista. */
  java.util.Optional<Consulta> findTopByClienteCorreoOrderByCreadaEnDesc(String clienteCorreo);

  /** Busca consultas por correo del cliente, ordenadas de más reciente a más antigua. */
  List<Consulta> findByClienteCorreoOrderByCreadaEnDesc(String clienteCorreo);
}

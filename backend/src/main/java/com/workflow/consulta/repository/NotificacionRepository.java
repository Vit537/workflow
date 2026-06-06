package com.workflow.consulta.repository;

import com.workflow.consulta.model.Notificacion;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificacionRepository extends MongoRepository<Notificacion, String> {

  List<Notificacion> findByUsuarioIdOrderByCreadaEnDesc(String usuarioId);

  List<Notificacion> findByUsuarioIdAndLeidaFalse(String usuarioId);
}

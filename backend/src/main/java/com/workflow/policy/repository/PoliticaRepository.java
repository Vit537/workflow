package com.workflow.policy.repository;

import com.workflow.policy.model.EstadoPolitica;
import com.workflow.policy.model.Politica;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import com.workflow.policy.dto.PoliticaResumenProjection;

@Repository
public interface PoliticaRepository extends MongoRepository<Politica, String> {

  @Query(value = "{}", fields = "{ '_id': 1, 'nombre': 1, 'descripcion': 1, 'estado': 1, 'creadoPor': 1, 'creadoEn': 1, 'actualizadoEn': 1 }")
  List<PoliticaResumenProjection> findAllResumen();

  @Query(value = "{ 'estado': ?0 }", fields = "{ '_id': 1, 'nombre': 1, 'descripcion': 1, 'estado': 1, 'creadoPor': 1, 'creadoEn': 1, 'actualizadoEn': 1 }")
  List<PoliticaResumenProjection> findResumenByEstado(EstadoPolitica estado);

  @Query(value = "{ 'nombre': { '$regex': ?0, '$options': 'i' }, 'estado': ?1 }", fields = "{ '_id': 1, 'nombre': 1, 'descripcion': 1, 'estado': 1, 'creadoPor': 1, 'creadoEn': 1, 'actualizadoEn': 1 }")
  List<PoliticaResumenProjection> findResumenByNombreContainingIgnoreCaseAndEstado(String keyword, EstadoPolitica estado);

  List<Politica> findByEstado(EstadoPolitica estado);

  List<Politica> findByNombreContainingIgnoreCaseAndEstado(String keyword, EstadoPolitica estado);
}

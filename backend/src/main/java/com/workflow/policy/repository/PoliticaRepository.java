package com.workflow.policy.repository;

import com.workflow.policy.model.EstadoPolitica;
import com.workflow.policy.model.Politica;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoliticaRepository extends MongoRepository<Politica, String> {

  List<Politica> findByEstado(EstadoPolitica estado);

  List<Politica> findByNombreContainingIgnoreCaseAndEstado(String keyword, EstadoPolitica estado);
}

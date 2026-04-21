package com.workflow.iam.repository;

import com.workflow.iam.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

  Optional<User> findByCorreo(String correo);

  boolean existsByCorreo(String correo);

  List<User> findAllByCorreo(String correo);
}

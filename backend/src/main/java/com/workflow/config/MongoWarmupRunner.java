package com.workflow.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Warms up the MongoDB connection pool and triggers index creation
 * eagerly at startup, so the first user-facing query is not delayed.
 */
@Component
public class MongoWarmupRunner implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(MongoWarmupRunner.class);

  private final MongoTemplate mongoTemplate;

  public MongoWarmupRunner(MongoTemplate mongoTemplate) {
    this.mongoTemplate = mongoTemplate;
  }

  @Override
  public void run(ApplicationArguments args) {
    try {
      mongoTemplate.executeCommand("{ ping: 1 }");
      // Touch each main collection so Spring Data creates indexes immediately
      mongoTemplate.getCollectionNames();
      log.info("MongoDB connection warmed up successfully.");
    } catch (Exception e) {
      log.warn("MongoDB warm-up failed (non-fatal): {}", e.getMessage());
    }
  }
}

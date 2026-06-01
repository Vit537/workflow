PS C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend> mvn spring-boot:run
[INFO] Scanning for projects...
[INFO] 
[INFO] --------------------< com.workflow:workflow-engine >--------------------
[INFO] Building workflow-engine 0.0.1-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] >>> spring-boot:3.3.6:run (default-cli) > test-compile @ workflow-engine >>>
[INFO] 
[INFO] --- resources:3.3.1:resources (default-resources) @ workflow-engine ---
[INFO] Copying 1 resource from src\main\resources to target\classes
[INFO] Copying 1 resource from src\main\resources to target\classes
[INFO] 
[INFO] --- compiler:3.13.0:compile (default-compile) @ workflow-engine ---
[INFO] Nothing to compile - all classes are up to date.
[INFO] 
[INFO] --- resources:3.3.1:testResources (default-testResources) @ workflow-engine ---
[INFO] skip non existing resourceDirectory C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend\src\test\resources
[INFO] 
[INFO] --- compiler:3.13.0:testCompile (default-testCompile) @ workflow-engine ---
[INFO] Nothing to compile - all classes are up to date.
[INFO] 
[INFO] <<< spring-boot:3.3.6:run (default-cli) < test-compile @ workflow-engine <<<
[INFO] 
[INFO] 
[INFO] --- spring-boot:3.3.6:run (default-cli) @ workflow-engine ---
[INFO] Attaching agents: []
Standard Commons Logging discovery in action with spring-jcl: please remove commons-logging.jar from classpath in order to avoid potential conflicts

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/

 :: Spring Boot ::                (v3.3.6)

2026-05-31T23:07:03.325-04:00  INFO 8408 --- [           main] com.workflow.WorkflowApplication         : Starting WorkflowApplication using Java 17.0.16 with PID 8408 (C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend\target\classes started by HP in C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend)
2026-05-31T23:07:03.328-04:00  INFO 8408 --- [           main] com.workflow.WorkflowApplication         : No active profile set, falling back to 1 default profile: "default"
2026-05-31T23:07:04.581-04:00  INFO 8408 --- [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data MongoDB repositories in DEFAULT mode.
2026-05-31T23:07:04.679-04:00  INFO 8408 --- [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 92 ms. Found 4 MongoDB repository interfaces.
2026-05-31T23:07:05.462-04:00  INFO 8408 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8080 (http)
2026-05-31T23:07:05.486-04:00  INFO 8408 --- [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2026-05-31T23:07:05.486-04:00  INFO 8408 --- [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/10.1.33]
2026-05-31T23:07:05.583-04:00  INFO 8408 --- [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2026-05-31T23:07:05.584-04:00  INFO 8408 --- [           main] w.s.c.ServletWebServerApplicationContext : Root WebApplicationContext: initialization completed in 2196 ms
Standard Commons Logging discovery in action with spring-jcl: please remove commons-logging.jar from classpath in order to avoid potential conflicts
2026-05-31T23:07:05.925-04:00  INFO 8408 --- [           main] org.mongodb.driver.client                : MongoClient with metadata {"driver": {"name": "mongo-java-driver|sync|spring-boot", "version": "5.0.1"}, "os": {"type": "Windows", "name": "Windows 11", "architecture": "amd64", "version": "10.0"}, "platform": "Java/Microsoft/17.0.16+8-LTS"} created with settings MongoClientSettings{readPreference=primary, writeConcern=WriteConcern{w=null, wTimeout=null ms, journal=null}, retryWrites=true, retryReads=true, readConcern=ReadConcern{level=null}, credential=null, transportSettings=null, commandListeners=[io.micrometer.core.instrument.binder.mongodb.MongoMetricsCommandListener@1b7554d4], codecRegistry=ProvidersCodecRegistry{codecProviders=[ValueCodecProvider{}, BsonValueCodecProvider{}, DBRefCodecProvider{}, DBObjectCodecProvider{}, DocumentCodecProvider{}, CollectionCodecProvider{}, IterableCodecProvider{}, MapCodecProvider{}, GeoJsonCodecProvider{}, GridFSFileCodecProvider{}, Jsr310CodecProvider{}, JsonObjectCodecProvider{}, BsonCodecProvider{}, EnumCodecProvider{}, com.mongodb.client.model.mql.ExpressionCodecProvider@57ce2898, com.mongodb.Jep395RecordCodecProvider@1ea930eb, com.mongodb.KotlinCodecProvider@2e0ad709]}, loggerSettings=LoggerSettings{maxDocumentLength=1000}, clusterSettings={hosts=[localhost:27017], srvServiceName=mongodb, mode=SINGLE, requiredClusterType=UNKNOWN, requiredReplicaSetName='null', serverSelector='null', clusterListeners='[]', serverSelectionTimeout='30000 ms', localThreshold='15 ms'}, socketSettings=SocketSettings{connectTimeoutMS=10000, readTimeoutMS=0, receiveBufferSize=0, proxySettings=ProxySettings{host=null, port=null, username=null, password=null}}, heartbeatSocketSettings=SocketSettings{connectTimeoutMS=10000, readTimeoutMS=10000, receiveBufferSize=0, proxySettings=ProxySettings{host=null, port=null, username=null, password=null}}, connectionPoolSettings=ConnectionPoolSettings{maxSize=100, minSize=0, maxWaitTimeMS=120000, maxConnectionLifeTimeMS=0, maxConnectionIdleTimeMS=0, maintenanceInitialDelayMS=0, maintenanceFrequencyMS=60000, connectionPoolListeners=[io.micrometer.core.instrument.binder.mongodb.MongoMetricsConnectionPoolListener@1fe8f5e8], maxConnecting=2}, serverSettings=ServerSettings{heartbeatFrequencyMS=10000, minHeartbeatFrequencyMS=500, serverListeners='[]', serverMonitorListeners='[]'}, sslSettings=SslSettings{enabled=false, invalidHostNameAllowed=false, context=null}, applicationName='null', compressorList=[], uuidRepresentation=JAVA_LEGACY, serverApi=null, autoEncryptionSettings=null, dnsClient=null, inetAddressResolver=null, contextProvider=null}
2026-05-31T23:07:05.958-04:00  INFO 8408 --- [localhost:27017] org.mongodb.driver.cluster               : Monitor thread successfully connected to server with description ServerDescription{address=localhost:27017, type=STANDALONE, state=CONNECTED, ok=true, minWireVersion=0, maxWireVersion=27, maxDocumentSize=16777216, logicalSessionTimeoutMinutes=30, roundTripTimeNanos=23537100}
2026-05-31T23:07:06.673-04:00  INFO 8408 --- [           main] com.workflow.config.FirebaseConfig       : Firebase Admin SDK inicializado correctamente
2026-05-31T23:07:06.959-04:00  INFO 8408 --- [           main] eAuthenticationProviderManagerConfigurer : Global AuthenticationManager configured with AuthenticationProvider bean with name authenticationProvider
2026-05-31T23:07:06.960-04:00  WARN 8408 --- [           main] r$InitializeUserDetailsManagerConfigurer : Global AuthenticationManager configured with an AuthenticationProvider bean. UserDetailsService beans will not be used for username/password login. Consider removing the AuthenticationProvider bean. Alternatively, consider using the UserDetailsService in a manually instantiated DaoAuthenticationProvider.
2026-05-31T23:07:07.493-04:00  INFO 8408 --- [           main] o.s.b.a.e.web.EndpointLinksResolver      : Exposing 1 endpoint beneath base path '/actuator'
2026-05-31T23:07:08.041-04:00  INFO 8408 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8080 (http) with context path '/'
2026-05-31T23:07:08.042-04:00  INFO 8408 --- [           main] o.s.m.s.b.SimpleBrokerMessageHandler     : Starting...
2026-05-31T23:07:08.043-04:00  INFO 8408 --- [           main] o.s.m.s.b.SimpleBrokerMessageHandler     : BrokerAvailabilityEvent[available=true, SimpleBrokerMessageHandler [org.springframework.messaging.simp.broker.DefaultSubscriptionRegistry@7057dbda]]
2026-05-31T23:07:08.044-04:00  INFO 8408 --- [           main] o.s.m.s.b.SimpleBrokerMessageHandler     : Started.
2026-05-31T23:07:08.060-04:00  INFO 8408 --- [           main] com.workflow.WorkflowApplication         : Started WorkflowApplication in 5.233 seconds (process running for 5.803)
2026-05-31T23:07:08.272-04:00  INFO 8408 --- [           main] com.workflow.config.MongoWarmupRunner    : MongoDB connection warmed up successfully.

[INFO] <<< spring-boot:3.3.6:run (default-cli) < test-compile @ workflow-engine <<<
[INFO] 
[INFO] 
[INFO] --- spring-boot:3.3.6:run (default-cli) @ workflow-engine ---
[INFO] Attaching agents: []

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/

 :: Spring Boot ::                (v3.3.6)

2026-04-12T10:56:59.801-04:00  INFO 28064 --- [           main] com.workflow.WorkflowApplication         : Starting WorkflowApplication using Java 17.0.16 with PID 28064 (C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend\target\classes started by HP in C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend)
2026-04-12T10:56:59.804-04:00 DEBUG 28064 --- [           main] com.workflow.WorkflowApplication         : Running with Spring Boot v3.3.6, Spring v6.1.15
2026-04-12T10:56:59.805-04:00  INFO 28064 --- [           main] com.workflow.WorkflowApplication         : No active profile set, falling back to 1 default profile: "default"
2026-04-12T10:57:00.587-04:00  WARN 28064 --- [           main] ConfigServletWebServerApplicationContext : Exception encountered during context initialization - cancelling refresh attempt: org.springframework.beans.factory.support.BeanDefinitionOverrideException: Invalid bean definition with name 'mongoAuditingHandler' defined in null: Cannot register bean definition [Root bean: class [org.springframework.data.auditing.IsNewAwareAuditingHandler]; scope=; abstract=false; lazyInit=null; autowireMode=2; dependencyCheck=0; autowireCandidate=true; primary=false; factoryBeanName=null; factoryMethodName=from; initMethodNames=null; destroyMethodNames=null] for bean 'mongoAuditingHandler' since there is already [Root bean: class [org.springframework.data.auditing.IsNewAwareAuditingHandler]; scope=; abstract=false; lazyInit=null; autowireMode=2; dependencyCheck=0; autowireCandidate=true; primary=false; factoryBeanName=null; factoryMethodName=from; initMethodNames=null; destroyMethodNames=null] bound.
2026-04-12T10:57:00.596-04:00  INFO 28064 --- [           main] .s.b.a.l.ConditionEvaluationReportLogger : 

Error starting ApplicationContext. To display the condition evaluation report re-run your application with 'debug' enabled.
2026-04-12T10:57:00.623-04:00 ERROR 28064 --- [           main] o.s.b.d.LoggingFailureAnalysisReporter   : 

***************************
APPLICATION FAILED TO START
***************************

Description:

The bean 'mongoAuditingHandler' could not be registered. A bean with that name has already been defined and overriding is disabled.

Action:

Consider renaming one of the beans or enabling overriding by setting spring.main.allow-bean-definition-overriding=true

[INFO] ------------------------------------------------------------------------
[INFO] BUILD FAILURE
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  11.100 s
[INFO] Finished at: 2026-04-12T10:57:00-04:00
[INFO] ------------------------------------------------------------------------
[ERROR] Failed to execute goal org.springframework.boot:spring-boot-maven-plugin:3.3.6:run (default-cli) on project workflow-engine: Process terminated with exit code: 1 -> [Help 1]
[ERROR] 
[ERROR] To see the full stack trace of the errors, re-run Maven with the -e switch.
[ERROR] Re-run Maven using the -X switch to enable full debug logging.
[ERROR] 
[ERROR] For more information about the errors and possible solutions, please read the following articles:
[ERROR] [Help 1] http://cwiki.apache.org/confluence/display/MAVEN/MojoExecutionException
PS C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend>                       

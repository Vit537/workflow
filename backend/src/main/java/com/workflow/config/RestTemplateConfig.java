package com.workflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        // Tiempo máximo para establecer conexión con el microservicio IA
        factory.setConnectTimeout(10_000);
        // Tiempo máximo de espera para la respuesta del LLM (Groq puede tardar 20-40s)
        factory.setReadTimeout(90_000);
        return new RestTemplate(factory);
    }
}

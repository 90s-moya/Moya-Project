package com.moya.support.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moya.support.security.jwt.JWTAuthenticationEntryPoint;
import com.moya.support.security.jwt.JWTFilter;
import com.moya.support.security.jwt.JwtUsernamePasswordAuthenticationFilter;
import com.moya.support.security.jwt.JWTUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.filter.CorsFilter;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JWTUtil jwtUtil;
    private final ObjectMapper objectMapper;
    private final AuthenticationConfiguration authenticationConfiguration;

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }


    public CharacterEncodingFilter encodingFilter() {
        CharacterEncodingFilter encodingFilter = new CharacterEncodingFilter();
        encodingFilter.setEncoding("UTF-8");
        encodingFilter.setForceEncoding(true);
        return encodingFilter;
    }

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    // 시큐리티 설정을 비활성화 - 커스텀설정으로 변경
    private static final String[] PERMIT_ALL_PATTERNS = {
            "/token/**",
            "/v1/auth/**",
            "/v1/user/check/email",
            "/css/**"
    };

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable);

        http
            .formLogin(AbstractHttpConfigurer::disable);

        http
            .httpBasic(AbstractHttpConfigurer::disable);

        // 인증 없이 접근을 허용할 API endpoint를 requestMatchers 안에 설정하세요 ex) 로그인과 상관없이 보이는 조회 API 등등
        http
            .authorizeHttpRequests((auth) -> auth
                .requestMatchers(
                        "v1/auth/*",
                    "/evaluate",
                    "/v1/otp",
                    "/v1/otp/check",
                    "/v1/auth/login",
                    "/v1/auth/signup",
                    "/v1/user/find-username",
                    "/v1/user/find-password",
                    "/v1/user/check-email",
                    "/v1/user/random",
                    "/v1/user/check-nickname",
                    "/v1/room/*",
                    "/css/**").permitAll()
                    .requestMatchers("v1/docs",
                            "/v1/docs/**").authenticated()
                    .anyRequest().authenticated()
            );

        http
            .exceptionHandling(
                exception -> exception.authenticationEntryPoint(new JWTAuthenticationEntryPoint(objectMapper)));

        http
            .addFilterBefore(new JWTFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class);

        http
            .addFilterBefore(encodingFilter(), CsrfFilter.class)
            .addFilterBefore(corsFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterAt(new JwtUsernamePasswordAuthenticationFilter(jwtUtil, objectMapper, authenticationManager(authenticationConfiguration)), UsernamePasswordAuthenticationFilter.class);

        http.sessionManagement((session) -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        );

        return http.build();
    }
}

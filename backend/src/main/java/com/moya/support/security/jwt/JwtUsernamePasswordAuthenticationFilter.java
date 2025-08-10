package com.moya.support.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moya.domain.user.TutorialStatus;
import com.moya.interfaces.api.auth.AuthUserLoginRequest;
import com.moya.support.security.auth.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
public class JwtUsernamePasswordAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private final JWTUtil jwtUtil;
    private final ObjectMapper objectMapper;
    private final AuthenticationManager authenticationManager;

    public JwtUsernamePasswordAuthenticationFilter(JWTUtil jwtUti, ObjectMapper objectMapper, AuthenticationManager authenticationManager) {
        setFilterProcessesUrl("/v1/auth/login");
        this.jwtUtil = jwtUti;
        this.objectMapper = objectMapper;
        this.authenticationManager = authenticationManager;
    }

    // 로그인 요청 처리
    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {

        try {
            // 요청 바디에서 로그인 정보 추출
            AuthUserLoginRequest loginRequest = objectMapper.readValue(request.getInputStream(), AuthUserLoginRequest.class);

            String email = loginRequest.getEmail();
            String password = loginRequest.getPassword();

            log.info("로그인 시도: {}", email);

            // 이메일 + 비밀번호로 인증 객체 생성
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(email, password);

            // AuthenticationManager에게 인증 요청
            return authenticationManager.authenticate(authToken);

        } catch (IOException e) {
            log.error("로그인 요청 파싱 실패", e);
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authentication) throws IOException, ServletException {
        CustomUserDetails customUserDetails = (CustomUserDetails) authentication.getPrincipal();
        UUID userId = customUserDetails.getUser().getId();
        TutorialStatus tutorialStatus=customUserDetails.getUser().getTutorialStatus();

        String token = jwtUtil.createJwt(userId,tutorialStatus, 604800000L);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", "로그인에 성공했습니다.");
        responseBody.put("token", token);
        responseBody.put("UUID",userId);
        responseBody.put("tutorialStatus",tutorialStatus);

        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        objectMapper.writeValue(response.getWriter(), responseBody);
    }

    @Override
    protected void unsuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response, AuthenticationException failed) throws IOException, ServletException {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", failed.getMessage());

        objectMapper.writeValue(response.getWriter(), responseBody);
    }
}

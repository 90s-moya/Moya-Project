package com.moya.support.security;


public final class SecurityConstants {

    // 인증 없이 접근 허용할 경로 (SecurityConfig & JWTFilter에서 공통 사용)
    public static final String[] PERMIT_ALL_PATHS = {
            "/v1/auth/**",
            "/api/v1/user/check/email",
            "/api/v1/user/find-username",
            "/api/v1/user/find-password",
            "/token/**",
            "/css/**"
    };

    private SecurityConstants() {
        // 유틸 클래스: 인스턴스화 방지
    }
}
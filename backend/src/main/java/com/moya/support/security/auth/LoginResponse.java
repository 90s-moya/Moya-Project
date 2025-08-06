package com.moya.support.security.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private UUID userId;
}

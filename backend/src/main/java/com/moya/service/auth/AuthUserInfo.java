package com.moya.service.auth;

import com.moya.domain.user.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class AuthUserInfo {

    private UUID userId;
    private String email;
    private String nickname;
    private LocalDateTime createAt;

    @Builder
    private AuthUserInfo(UUID userId, String nickname, String email, LocalDateTime createAt) {
        this.userId = userId;
        this.email = email;
        this.nickname = nickname;
        this.createAt = createAt;

    }

    public static AuthUserInfo from(User user) {
        return AuthUserInfo.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .createAt(user.getCreatedAt())
                .build();
    }
}

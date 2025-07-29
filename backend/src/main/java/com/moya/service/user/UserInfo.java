package com.moya.service.user;

import com.moya.domain.user.User;
import com.moya.service.auth.AuthUserInfo;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserInfo {
    private UUID userId;
    private String nickname;

    @Builder
    private UserInfo(UUID userId, String nickname) {
        this.userId = userId;
        this.nickname = nickname;


    }

    public static UserInfo from(User user) {
        return UserInfo.builder()
                .userId(user.getId())
                .nickname(user.getNickname())
                .build();
    }
}

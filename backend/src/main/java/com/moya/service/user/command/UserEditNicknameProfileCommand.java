package com.moya.service.user.command;

import lombok.Getter;

import java.util.UUID;

@Getter
public class UserEditNicknameProfileCommand {
    private UUID userId;
    private String nickname;

    public UserEditNicknameProfileCommand(UUID userId, String nickname){
        this.userId=userId;
        this.nickname=nickname;
    }
}

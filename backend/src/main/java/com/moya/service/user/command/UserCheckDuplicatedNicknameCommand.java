package com.moya.service.user.command;

import lombok.Getter;

@Getter
public class UserCheckDuplicatedNicknameCommand {
    private String nickname;

    public UserCheckDuplicatedNicknameCommand(String nickname){
        this.nickname=nickname;
    }

}

package com.moya.service.user.command;

import lombok.Getter;

@Getter

public class UserCheckDuplicatedEmailCommand {
    private String email;

    public UserCheckDuplicatedEmailCommand(String email){
        this.email = email;
    }
}

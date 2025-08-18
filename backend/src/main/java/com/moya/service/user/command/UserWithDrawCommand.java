package com.moya.service.user.command;

import lombok.Getter;

import java.util.UUID;

@Getter

public class UserWithDrawCommand {
    private final UUID userId;

    public UserWithDrawCommand(UUID userId) {
        this.userId = userId;
    }
}


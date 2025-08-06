package com.moya.service.user.command;

import lombok.Getter;

import java.util.UUID;

@Getter
public class UserEditPasswordCommand {
	private UUID userId;
	private String newPassword;

	public UserEditPasswordCommand(UUID userId, String newPassword) {
		this.userId = userId;
		this.newPassword = newPassword;
	}

}

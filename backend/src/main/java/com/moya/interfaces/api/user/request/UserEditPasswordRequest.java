package com.moya.interfaces.api.user.request;

import com.moya.service.user.command.UserEditPasswordCommand;
import lombok.Getter;

import java.util.UUID;

import static com.moya.support.exception.BusinessError.*;

@Getter
public class UserEditPasswordRequest {

	private String newPassword;
	private String confirmPassword;

	public UserEditPasswordRequest(String newPassword, String confirmPassword) {
		this.newPassword = newPassword;
		this.confirmPassword = confirmPassword;
	}

	public UserEditPasswordCommand toCommand(UUID userId) {

		if (newPassword == null || newPassword.isEmpty()) {
			throw USER_EDIT_NEW_PASSWORD_NULL_OR_EMPTY.exception();
		}

		if (!newPassword.equals(confirmPassword)) {
			throw USER_EDIT_CONFIRM_PASSWORD_NULL_OR_EMPTY.exception();
		}

		return new UserEditPasswordCommand(userId, newPassword);
	}
}

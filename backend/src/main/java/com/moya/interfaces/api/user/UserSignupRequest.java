package com.moya.interfaces.api.user;

import com.moya.service.user.UserSignUpCommand;

import static com.moya.support.exception.BusinessError.*;

public class UserSignupRequest {

	private String username;
	private String password;
	private String confirmPassword;

	public UserSignUpCommand toCommand() {

		if (!password.equals(confirmPassword)) {
			throw USER_SIGNUP_PASSWORD_NOT_MATCH.exception();
		}

		return new UserSignUpCommand(username, password);
	}
}

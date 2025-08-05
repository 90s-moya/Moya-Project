package com.moya.interfaces.api.user.request;

import com.moya.service.user.command.FindUsernameCommand;
import lombok.Getter;

import static com.moya.support.exception.BusinessError.*;

@Getter
public class FindUsernameRequest {
	private String email;
	private String type;
	private String otp;

	public FindUsernameRequest(String email, String type, String otp) {
		this.email = email;
		this.type = type;
		this.otp = otp;
	}

	public FindUsernameCommand toCommand() {

		if (email == null || email.isEmpty()) {
			throw USER_SIGNUP_EMAIL_NULL_OR_EMPTY.exception();
		}

		if (type == null || type.isEmpty()) {
			throw MAIL_SEND_TYPE_NULL_OR_EMPTY.exception();
		}

		if (otp == null || otp.isEmpty()) {
			throw USER_SIGNUP_OTP_NOT_FOUND.exception();
		}

		return new FindUsernameCommand(email, type, otp);
	}
}

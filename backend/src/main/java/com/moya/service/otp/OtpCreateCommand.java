package com.moya.service.otp;

import com.moya.domain.otp.OtpType;
import lombok.Getter;

import static com.moya.support.exception.BusinessError.*;

@Getter
public class OtpCreateCommand {
	private String email;
	private OtpType type;

	public OtpCreateCommand(String email, String type) {

		if (email == null || email.isEmpty()) {
			throw MAIL_SEND_EMAIL_NULL_OR_EMPTY.exception();
		}

		if (type == null || type.isEmpty()) {
			throw MAIL_SEND_TYPE_NULL_OR_EMPTY.exception();
		}

		this.email = email;
		this.type = OtpType.from(type);
	}
}

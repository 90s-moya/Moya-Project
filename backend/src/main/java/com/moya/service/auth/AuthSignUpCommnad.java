package com.moya.service.auth;

import lombok.Getter;

@Getter
public class AuthSignUpCommnad {

	private String email;
	private String nickname;
	private String password;
	private String otp;

	public AuthSignUpCommnad(String email, String nickname, String password, String otp) {
		this.email = email;
		this.nickname = nickname;
		this.password = password;
		this.otp = otp;
	}
}

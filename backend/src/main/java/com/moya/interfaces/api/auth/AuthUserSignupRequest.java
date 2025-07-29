package com.moya.interfaces.api.auth;

import com.moya.service.auth.AuthSignUpCommnad;

import static com.moya.support.exception.BusinessError.*;
import static com.moya.support.exception.BusinessError.USER_SIGNUP_CONFIRM_PASSWORD_NULL_OR_EMPTY;
import static com.moya.support.exception.BusinessError.USER_SIGNUP_OTP_NULL_OR_EMPTY;
import static com.moya.support.exception.BusinessError.USER_SIGNUP_PASSWORD_NOT_MATCH;

public class AuthUserSignupRequest {

    private String email;
    private String nickname;
    private String password;
    private String confirmPassword;
    private String otp;

    public AuthUserSignupRequest(String email, String nickname, String password, String confirmPassword, String otp) {
        this.email = email;
        this.nickname = nickname;
        this.password = password;
        this.confirmPassword = confirmPassword;
        this.otp = otp;
    }

    public AuthSignUpCommnad toCommand() {

        if (email == null || email.isEmpty()) {
            throw USER_SIGNUP_EMAIL_NULL_OR_EMPTY.exception();
        }

        if (nickname == null || nickname.isEmpty()) {
            throw USER_SIGNUP_USERNAME_NULL_OR_EMPTY.exception();
        }

        if (password == null || password.isEmpty()) {
            throw USER_SIGNUP_PASSWORD_NULL_OR_EMPTY.exception();
        }

        if (confirmPassword == null || confirmPassword.isEmpty()) {
            throw USER_SIGNUP_CONFIRM_PASSWORD_NULL_OR_EMPTY.exception();
        }

        if (!password.equals(confirmPassword)) {
            throw USER_SIGNUP_PASSWORD_NOT_MATCH.exception();
        }



        if (otp == null || otp.isEmpty()) {
            throw USER_SIGNUP_OTP_NULL_OR_EMPTY.exception();
        }

        return new AuthSignUpCommnad(email, nickname, password, otp);
    }
}

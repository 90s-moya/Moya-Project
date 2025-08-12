package com.moya.support.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.springframework.http.HttpStatus.*;

@Getter
public enum BusinessError {

	// 유저 관련 Error
	USER_SIGNUP_PASSWORD_NOT_MATCH(BAD_REQUEST, "password와 confirmPassword가 다릅니다."),
	USER_SIGNUP_EMAIL_NULL_OR_EMPTY(BAD_REQUEST, "이메일을 입력해주세요."),
	USER_SIGNUP_USERNAME_NULL_OR_EMPTY(BAD_REQUEST, "아이디를 입력해주세요."),
	USER_SIGNUP_PASSWORD_NULL_OR_EMPTY(BAD_REQUEST, "비밀번호를 입력해주세요."),
	USER_SIGNUP_CONFIRM_PASSWORD_NULL_OR_EMPTY(BAD_REQUEST, "비밀번호 확인를 입력해주세요."),
	USER_SIGNUP_NICKNAME_NULL_OR_EMPTY(BAD_REQUEST, "닉네임을 입력해주세요."),
	USER_SIGNUP_NICKNAME_DUPLICATED(CONFLICT,"중복된 닉네임입니다"),
	USER_SIGNUP_OTP_NULL_OR_EMPTY(BAD_REQUEST, "OTP 번호를 입력해주세요."),
	USER_SIGNUP_USERNAME_DUPLICATE_NULL_OR_EMPTY(BAD_REQUEST, "이메일을 입력해주세요."),
	USER_SIGNUP_OTP_NOT_FOUND(NOT_FOUND, "인증정보를 확인할 수 없습니다."),
	NOT_VERIFIED_OTP_ERROR(BAD_REQUEST, "이메일 인증을 진행해주세요."),
	USER_NOT_FOUND_ERROR(NOT_FOUND, "회원을 찾을 수 없습니다."),
	USER_EMAIL_DUPLICATE_ERROR(CONFLICT, "이미 가입된 이메일입니다."),
	USER_EDIT_NEW_PASSWORD_NULL_OR_EMPTY(BAD_REQUEST, "변경하실 비밀번호를 입력해주세요."),
	USER_EDIT_CONFIRM_PASSWORD_NULL_OR_EMPTY(BAD_REQUEST, "새로운 비밀번호와 일치하지 않습니다."),
	USER_RANDOM_FAIL_CREATED(BAD_REQUEST,"랜덤 닉네임 생성 실패: 중복 회피 실패"),
	USER_EDIT_NICKNAME_DUPLICATE_OLD_NICKNAME(CONFLICT,"이전 닉네임이랑 중복됩니다"),
	// 메일 관련 Error
	MAIL_SEND_EMAIL_NULL_OR_EMPTY(BAD_REQUEST, "이메일을 입력해주세요."),
	MAIL_SEND_TYPE_NULL_OR_EMPTY(BAD_REQUEST, "타입을 입력해주세요."),
	CHECK_OTP_NULL_OR_EMPTY(BAD_REQUEST, "otp번호를 입력해주세요."),
	NOT_FOUND_OTP_ERROR(NOT_FOUND, "인증정보를 찾을 수 없습니다."),
	EXPIRED_OTP_ERROR(BAD_REQUEST, "인증시간이 만료되었습니다."),
	//이력서관련 Error
	FILE_TYPE_MISMATCH_ERROR(BAD_REQUEST,"파일 타입이 일치하지 않습니다"),
	MAXIMUM_DOCS_LIMIT_EXCEEDED(BAD_REQUEST,"파일은 3개 초과될 수 없습니다."),
	INVALID_FILE_TYPE(BAD_REQUEST,"pdf 파일만 허용됩니다."),
	FILE_URL_NULL_OR_EMPTY(NOT_FOUND,"파일이 존재하지 않습니다"),
	//PDF 관련 Error
	PDF_GET_URL_ERROR(NOT_FOUND,"유효한 PDF가 존재하지 않습니다."),
	PDF_GET_TEXT_FAIL(BAD_REQUEST,"PDF 파일 추출에 실패했습니다"),
	PDF_FAIL_TEXT(BAD_REQUEST,"PDF 파일을 텍스트 변환하는데 실패하였습니다."),
	//ai 모의 면접 관련 Error
;

	//화상채팅 관련 Error




	private final HttpStatus httpStatus;
	private final String message;

	BusinessError(HttpStatus httpStatus, String message) {
		this.httpStatus = httpStatus;
		this.message = message;
	}

	public BusinessException exception() {
		return new BusinessException(httpStatus, message);
	}
	public ResponseEntity<String> toResponseEntity() {
		return ResponseEntity.status(httpStatus).body(message);
	}
}


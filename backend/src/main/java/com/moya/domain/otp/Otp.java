package com.moya.domain.otp;

import com.moya.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static com.moya.support.exception.BusinessError.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Otp extends BaseEntity {

	@Id
	@Column(name = "otp_id")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String email;
	private String otp;

	@Enumerated(EnumType.STRING)
	private OtpType type;
	private Boolean isVerified;
	private LocalDateTime expiredAt;

	@Builder
	private Otp(String email, OtpType type, String otp) {
		this.email = email;
		this.otp = otp;
		this.type = type;
		this.isVerified = false;
		this.expiredAt = LocalDateTime.now().plusMinutes(5);
	}

	public static Otp 	create(String email, OtpType type, String otp) {
		return Otp.builder()
			.email(email)
			.type(type)
			.otp(otp)
			.build();
	}

	public void verify() {
		if (LocalDateTime.now().isAfter(expiredAt)) {
			throw EXPIRED_OTP_ERROR.exception();
		}
		this.isVerified = true;
	}

	public void validateVerified() {
		if (!this.isVerified) {
			throw NOT_VERIFIED_OTP_ERROR.exception();
		}
	}
}

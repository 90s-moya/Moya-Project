package com.moya.infras.otp;

import com.moya.domain.otp.Otp;
import com.moya.domain.otp.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpJpaRepository extends JpaRepository<Otp, Long> {
	Optional<Otp> findByOtp(String otp);
	Optional<Otp> findByEmailAndOtp(String email, String otp);
	Optional<Otp> findByEmail(String email);

	Optional<Otp> findByEmailAndTypeAndOtp(String email, OtpType type, String otp);
}

package com.moya.service.auth;

import com.moya.domain.otp.Otp;
import com.moya.domain.otp.OtpRepository;
import com.moya.domain.user.User;
import com.moya.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.moya.support.exception.BusinessError.NOT_FOUND_OTP_ERROR;
import static com.moya.support.exception.BusinessError.USER_EMAIL_DUPLICATE_ERROR;
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthUserInfo signUp(AuthSignUpCommnad command) {
        // 이메일 중복 체크
        userRepository.findByEmail(command.getEmail())
                .ifPresent(user -> { throw USER_EMAIL_DUPLICATE_ERROR.exception(); });

        // 인증된 OTP 조회
        Otp otp = otpRepository.findByEmailAndOtp(command.getEmail(), command.getOtp())
                .orElseThrow(NOT_FOUND_OTP_ERROR::exception);

        // 사용자 생성 및 인증 확인
        User user = User.create(
                command.getEmail(),
                command.getNickname(),
                passwordEncoder.encode(command.getPassword())
        );
        user.signUp(otp);

        // 저장 후 반환
        userRepository.save(user);
        return AuthUserInfo.from(user);
    }
}
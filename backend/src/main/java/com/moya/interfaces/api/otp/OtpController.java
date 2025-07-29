package com.moya.interfaces.api.otp;


import com.moya.service.otp.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class OtpController {

	private final OtpService mailService;

	@PostMapping("/api/v1/otp")
	public ResponseEntity<Void> otpCreate(@RequestBody OptCreateRequest request) {

		mailService.otpCreate(request.toCommand());

		return ResponseEntity.ok(null);
	}

	@PostMapping("/api/v1/otp/check")
	public ResponseEntity<Void> otpCheck(@RequestBody OtpCheckRequest request) {

		mailService.checkOtp(request.toCommand());

		return ResponseEntity.ok(null);
	}
}

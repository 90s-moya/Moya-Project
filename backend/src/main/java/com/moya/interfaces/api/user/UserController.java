package com.moya.interfaces.api.user;

import com.moya.service.user.UserInfo;
import com.moya.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/user")
@RequiredArgsConstructor
public class UserController {

	private final UserService userService;

	@PostMapping("/signup")
	public ResponseEntity<UserInfo> signup(@RequestBody UserSignupRequest request) {
			return ResponseEntity.ok(userService.signUp(request.toCommand()));
	}
}

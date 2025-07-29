package com.moya.interfaces.api.user;


import com.moya.domain.auth.AuthUser;
import com.moya.interfaces.api.user.request.*;
import com.moya.service.auth.AuthUserInfo;
import com.moya.service.user.UserInfo;
import com.moya.service.user.UserService;
import com.moya.service.user.command.UserWithDrawCommand;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/v1/user")
@RequiredArgsConstructor
public class UserController {

	private final UserService userService;


	@PostMapping("/check-email")
	public ResponseEntity<String> checkEmail(@RequestBody UserCheckDuplicatedEmailRequest request) {
		userService.isUserEmailDuplicated(request.toCommand());
		return ResponseEntity.ok("가입할 수 있는 아이디입니다.");
	}
	@GetMapping("/check-nickname")
	public ResponseEntity<String> checkNickname(@RequestParam String nickname) {
		userService.isUserNicknameDuplicated(nickname);
		return ResponseEntity.ok("사용 가능한 닉네임입니다");
	}

	// 유저에 대한 접근은 시큐리티에 커스텀 유저로 접근해야 되기 때문에 request 불필요 ->
	//@AuthenticationPrincipal 이걸로 인가된 사용자인지 시큐리티 자체적으로 검증해주기 대문에 커스텀 유저로 접근해서
	// 체크해야됨
	@PatchMapping("/me")
	public ResponseEntity<Void> withDrawUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
		UUID userId = userDetails.getUserId();

		userService.withDrawUser(new UserWithDrawCommand(userId));

		return ResponseEntity.ok(null);
	}

	@GetMapping("/me")
	public ResponseEntity<AuthUserInfo> getProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
		return ResponseEntity.ok(userService.getProfile(userDetails.getUserId()));
	}
	@PatchMapping("/nickname")
	public ResponseEntity<AuthUserInfo> getNicknameProfile(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody UserEditNicknameRequest request){
		return ResponseEntity.ok(userService.editNicknameProfile(request.toCommand(userDetails.getUserId())));
	}
	@PatchMapping("/password")
	public ResponseEntity<AuthUserInfo> getProfile(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody UserEditPasswordRequest request) {
		return ResponseEntity.ok(userService.editPasswordProfile(request.toCommand(userDetails.getUserId())));
	}

	@PostMapping("/find-username")
	public ResponseEntity<Void> findUsername(@RequestBody FindUsernameRequest request) {
		userService.findEmail(request.toCommand());
		return ResponseEntity.ok(null);
	}

	@PostMapping("/find-password")
	public ResponseEntity<Void> findPassword(@RequestBody FindPasswordRequest request) {
		userService.findPassword(request.toCommand());
		return ResponseEntity.ok(null);
	}
	@GetMapping("/random")
	public ResponseEntity<Map<String,String>> getRandomNickname(){
		String nickname= userService.generateUniqueNickname();
		return ResponseEntity.ok(Map.of("random_nickname",nickname));
	}

}



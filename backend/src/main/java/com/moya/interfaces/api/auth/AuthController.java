package com.moya.interfaces.api.auth;

import com.moya.service.auth.AuthService;
import com.moya.service.auth.AuthSignUpCommnad;
import com.moya.service.auth.AuthUserInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthUserInfo> signup(@RequestBody AuthUserSignupRequest request) {
        AuthUserInfo userInfo = authService.signUp(request.toCommand());
        return ResponseEntity.status(HttpStatus.CREATED).body(userInfo);
    }
}

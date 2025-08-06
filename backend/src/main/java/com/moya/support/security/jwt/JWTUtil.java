package com.moya.support.security.jwt;

import com.moya.domain.user.TutorialStatus;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JWTUtil {

	private SecretKey secretKey;

	public JWTUtil(@Value("${spring.jwt.secret}") String secret) {
		secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), Jwts.SIG.HS256.key().build().getAlgorithm());
	}

	public UUID getUserId(String token) {

		String userIdStr = Jwts.parser()
				.verifyWith(secretKey)
				.build()
				.parseSignedClaims(token)
				.getPayload()
				.get("userId", String.class);

		return UUID.fromString(userIdStr);
	}

	public String getRole(String token) {

		return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload().get("role", String.class);
	}

	public Boolean isExpired(String token) {

		return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload().getExpiration().before(new Date());
	}

	public String createJwt(UUID userId, TutorialStatus tutorialStatus, Long expiredMs) {

		return Jwts.builder()
			.claim("userId", userId.toString())
				.claim("tutorialStatus",tutorialStatus.toString())
			.issuedAt(new Date(System.currentTimeMillis()))
			.expiration(new Date(System.currentTimeMillis() + expiredMs))
			.signWith(secretKey)
			.compact();
	}
}

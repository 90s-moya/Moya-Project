package com.moya.service.user;

import com.moya.domain.user.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
@Getter
public class UserInfo {

	private Long userId;
	private String username;
	private LocalDateTime createAt;

	@Builder
	private UserInfo(Long userId, String username, LocalDateTime createAt) {
		this.userId = userId;
		this.username = username;
		this.createAt = createAt;
	}

	public static UserInfo from(User user) {
		return UserInfo.builder()
			.userId(user.getId())
			.username(user.getUsername())
			.createAt(user.getCreatedAt())
			.build();
	}
}

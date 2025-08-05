package com.moya.domain.user;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
	User save(User user);
	Optional<User> findByEmail(String email);
	Optional<User> findById(UUID id);
	Optional<User> findByNickname(String nickname);
	boolean existsByEmail(String email);
	boolean existsByNickname(String nickname);
}

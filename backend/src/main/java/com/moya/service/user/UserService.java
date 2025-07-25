package com.moya.service.user;

import com.moya.domain.user.User;
import com.moya.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;

	@Transactional
	public UserInfo signUp(UserSignUpCommand command) {
		User user = new User(command.getUsername(), command.getPassword());
		userRepository.save(user);
		return UserInfo.from(user);
	}

}

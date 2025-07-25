package com.moya.service.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;


import static org.assertj.core.api.Assertions.assertThat;


@SpringBootTest
class UserServiceTest {
    @Autowired
    private UserService userService;
    @Test
    void testCreateUser() {
        UserSignUpCommand command = new UserSignUpCommand("example@naver.com", "moya1234");

        UserInfo userInfo = userService.signUp(command);

        assertThat(userInfo.getUserId()).isNotNull();
        assertThat(userInfo.getUsername()).isEqualTo("example@naver.com");
    }

}
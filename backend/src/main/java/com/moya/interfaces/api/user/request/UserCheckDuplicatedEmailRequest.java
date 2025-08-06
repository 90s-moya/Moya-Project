package com.moya.interfaces.api.user.request;

import com.moya.service.user.command.UserCheckDuplicatedEmailCommand;
import com.moya.support.exception.BusinessError;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserCheckDuplicatedEmailRequest {
    private String email;

    public UserCheckDuplicatedEmailCommand toCommand(){
        if (email == null || email.isEmpty()) {
            throw BusinessError.USER_SIGNUP_USERNAME_DUPLICATE_NULL_OR_EMPTY.exception();
        }
        return new UserCheckDuplicatedEmailCommand(email);
    }

}

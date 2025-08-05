package com.moya.interfaces.api.user.request;

import com.moya.service.user.command.UserCheckDuplicatedEmailCommand;
import com.moya.service.user.command.UserCheckDuplicatedNicknameCommand;
import com.moya.support.exception.BusinessError;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserCheckDuplicatedNicknameRequest {
    private String nickname;

    public UserCheckDuplicatedNicknameCommand toCommand(){

        if ( nickname == null || nickname.isEmpty()){
           throw BusinessError.USER_SIGNUP_USERNAME_DUPLICATE_NULL_OR_EMPTY.exception();
        }
        return new UserCheckDuplicatedNicknameCommand(nickname);
    }
}

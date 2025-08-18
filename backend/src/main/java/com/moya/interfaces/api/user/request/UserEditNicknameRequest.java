package com.moya.interfaces.api.user.request;

import com.moya.service.user.command.UserEditNicknameProfileCommand;
import lombok.Getter;

import java.util.UUID;

import static com.moya.support.exception.BusinessError.USER_EDIT_NEW_PASSWORD_NULL_OR_EMPTY;
import static com.moya.support.exception.BusinessError.USER_SIGNUP_NICKNAME_NULL_OR_EMPTY;

@Getter
public class UserEditNicknameRequest {
    private String newNickname;

    public UserEditNicknameRequest(String newNickname){
        this.newNickname=newNickname;

    }
    public UserEditNicknameProfileCommand toCommand(UUID userId) {
        if (newNickname == null || newNickname.isEmpty()) {
            throw USER_SIGNUP_NICKNAME_NULL_OR_EMPTY.exception();
        }
    return new UserEditNicknameProfileCommand(userId,newNickname);
    }

}

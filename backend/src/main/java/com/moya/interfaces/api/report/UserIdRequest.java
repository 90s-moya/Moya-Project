package com.moya.interfaces.api.report;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserIdRequest {
    @com.fasterxml.jackson.annotation.JsonProperty("user_id")
    private String userId;
    public UserIdRequest() {}
    public UserIdRequest(String userId) { this.userId = userId; }
}

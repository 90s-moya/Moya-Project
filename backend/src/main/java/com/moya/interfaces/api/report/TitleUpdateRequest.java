package com.moya.interfaces.api.report;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TitleUpdateRequest {
    private String title;

    public TitleUpdateRequest() {}
    public TitleUpdateRequest(String title) { this.title = title; }


}
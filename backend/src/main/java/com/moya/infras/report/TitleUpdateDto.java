package com.moya.infras.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TitleUpdateDto {
    @JsonProperty("report_id")
    private String report_id;
    private String title;
    private boolean updated;

}


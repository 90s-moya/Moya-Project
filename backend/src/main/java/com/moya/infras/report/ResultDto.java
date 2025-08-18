package com.moya.infras.report;


import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ResultDto {
    private String resultId;
    private String createdAt;
    private String reportId;
    private String reportTitle;
    private String status;
    private Integer order;
    private Integer suborder;
    private String answer;
    private String question;
    private String thumbnailUrl;

}


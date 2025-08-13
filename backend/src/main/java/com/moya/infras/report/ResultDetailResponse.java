package com.moya.infras.report;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ResultDetailResponse {
    private String resultId;
    private String reportId;
    private String reportTitle;
    private String createdAt;

    private String videoUrl;
    private VerbalResult verbalResult;
    private PostureResult postureResult;
    private FaceResult faceResult;
}
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
class VerbalResult {
    private String answer;
    private String stopwords;
    private Boolean isEnded;
    private String reasonEnd;
    private Boolean contextMatched;
    private String reasonContext;
    private String gptComment;
    private String endType;
    private String speechLabel;
    private Double syllArt;
}
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
class PostureResult {
    private String timestamp;
    private Integer totalFrames;
    private Map<String, Integer> frameDistribution;
    private List<RangeLog> detailedLogs;
}
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
class FaceResult {
    private String timestamp;
    private Integer totalFrames;
    private Map<String, Integer> frameDistribution;
    private List<RangeLog> detailedLogs;
}
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
class RangeLog {
    private String label;
    private Integer startFrame;
    private Integer endFrame;
}
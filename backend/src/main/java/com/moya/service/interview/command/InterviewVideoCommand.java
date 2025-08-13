package com.moya.service.interview.command;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class InterviewVideoCommand {
    private String videoUrl;
    private String ThumbnailUrl;
}

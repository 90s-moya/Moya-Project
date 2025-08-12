package com.moya.service.feedback.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class FeedbackResultCommand {
    private String videoUrl;
    private List<FeedbackInfoCommand> feedbackList;
}

package com.moya.service.feedback.command;

import com.moya.domain.feedback.FeedbackType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class FeedbackInfoCommand {
    private UUID feedbackId;
    private UUID roomId;
    private FeedbackType feedbackType;
    private String message;
}

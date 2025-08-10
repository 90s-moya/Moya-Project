package com.moya.service.feedback.command;

import com.moya.domain.feedback.FeedbackType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class FeedbackInfoCommand {
    private UUID fdId;
    private FeedbackType feedbackType;
    private String message;
    private LocalDateTime createdAt;
}

package com.moya.interfaces.api.feedback.request;

import com.moya.domain.feedback.FeedbackType;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
public class FeedbackRequest {
    private UUID roomId;
    private UUID receiverId;
    private FeedbackType feedbackType;
    private String message;
}

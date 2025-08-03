package com.moya.interfaces.api.feedback;

import com.moya.service.feedback.FeedbackService;
import com.moya.service.feedback.command.FeedbackInfoCommand;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/feedback")
@RequiredArgsConstructor
public class FeedbackController {
    private final FeedbackService feedbackService;

    // 내 피드백 전체 조회
    @GetMapping()
    public ResponseEntity<List<FeedbackInfoCommand>> getFeedback(@AuthenticationPrincipal CustomUserDetails user) {
        UUID userId = user.getUserId();
        List<FeedbackInfoCommand> feedback = feedbackService.selectFeedback(userId);
        return ResponseEntity.ok(feedback);
    }



}

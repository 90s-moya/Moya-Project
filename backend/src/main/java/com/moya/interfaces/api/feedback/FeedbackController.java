package com.moya.interfaces.api.feedback;

import com.moya.interfaces.api.feedback.request.FeedbackRequest;
import com.moya.service.feedback.FeedbackService;
import com.moya.service.feedback.command.FeedbackInfoCommand;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    // 피드백 보내기
    @PostMapping()
    public ResponseEntity<UUID> sendFeedback(@RequestBody FeedbackRequest request, @AuthenticationPrincipal CustomUserDetails user) {
        UUID senderId = user.getUserId();
        UUID feedbackId = feedbackService.sendFeedback(request, senderId);
        return ResponseEntity.ok(feedbackId);
    }

}

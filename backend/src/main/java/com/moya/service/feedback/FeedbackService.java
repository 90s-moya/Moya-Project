package com.moya.service.feedback;

import com.moya.domain.feedback.Feedback;
import com.moya.domain.feedback.FeedbackRepository;
import com.moya.service.feedback.command.FeedbackInfoCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackService {
    private final FeedbackRepository feedbackRepository;

    // 받은 내 피드백 전체 조회
    @Transactional
    public List<FeedbackInfoCommand> selectFeedback(UUID userId) {
        List<Feedback> feedback = feedbackRepository.findByUserId(userId);

        return feedback.stream()
                .map(f -> FeedbackInfoCommand.builder()
                        .feedbackId(f.getId())
                        .roomId(f.getRoom().getId())
                        .feedbackType(f.getType())
                        .message(f.getMessage())
                        .build())
                .toList();
    }

}

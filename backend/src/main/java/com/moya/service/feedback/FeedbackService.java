package com.moya.service.feedback;

import com.moya.domain.feedback.Feedback;
import com.moya.domain.feedback.FeedbackRepository;
import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.user.User;
import com.moya.domain.user.UserRepository;
import com.moya.interfaces.api.feedback.request.FeedbackRequest;
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
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

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

    // 피드백 보내기
    @Transactional
    public UUID sendFeedback(FeedbackRequest request, UUID senderId){
        Room room = roomRepository.getById(request.getRoomId());
        User receiver = userRepository.findById(request.getReceiverId()).orElseThrow(() -> new IllegalArgumentException("수신자 정보가 없습니다."));;
        User sender = userRepository.findById(senderId).orElseThrow(() -> new IllegalArgumentException("수신자 정보가 없습니다."));;

        Feedback feedback = Feedback.builder()
                .room(room)
                .type(request.getFeedbackType())
                .sender(sender)
                .receiver(receiver)
                .message(request.getMessage())
                .build();

        Feedback sendFeedback = feedbackRepository.save(feedback);
        return sendFeedback.getId();
    }

}

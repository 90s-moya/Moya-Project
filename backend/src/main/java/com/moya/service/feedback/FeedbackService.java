package com.moya.service.feedback;

import com.moya.domain.feedback.Feedback;
import com.moya.domain.feedback.FeedbackRepository;
import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.roommember.RoomMember;
import com.moya.domain.roommember.RoomMemberRepository;
import com.moya.domain.user.User;
import com.moya.domain.user.UserRepository;
import com.moya.interfaces.api.feedback.request.FeedbackRequest;
import com.moya.service.feedback.command.FeedbackInfoCommand;
import com.moya.service.feedback.command.FeedbackResultCommand;
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
    private final RoomMemberRepository roomMemberRepository;

    // 받은 내 피드백 전체 조회
    @Transactional
    public FeedbackResultCommand selectFeedback(UUID userId, UUID roomId) {
        // 해당 방 feedbacklist 조회
        List<Feedback> feedback = feedbackRepository.findByUserIdAndRoomId(userId, roomId);
        List<FeedbackInfoCommand> feedbackList = feedback.stream()
                .map(f -> FeedbackInfoCommand.builder()
                        .fdId(f.getId())
                        .feedbackType(f.getType())
                        .message(f.getMessage())
                        .createdAt(f.getCreatedAt())
                        .build())
                .toList();

        // 해당 방 video Url 조회
        RoomMember rm = roomMemberRepository.findByRoomIdAndUserId(roomId, userId);

        FeedbackResultCommand feedbackResult = FeedbackResultCommand.builder()
                .videoUrl(rm.getVideo_url())
                .videoStart(rm.getVideo_start())
                .feedbackList(feedbackList)
                .build();
        return feedbackResult;
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

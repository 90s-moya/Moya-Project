package com.moya.service.room;

import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.roommember.RoomMember;
import com.moya.domain.roommember.RoomMemberId;
import com.moya.domain.roommember.RoomMemberRepository;
import com.moya.domain.user.User;
import com.moya.domain.user.UserRepository;
import com.moya.interfaces.api.room.request.UploadVideoRequest;
import com.moya.support.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class RoomMemberService {

    private final RoomMemberRepository roomMemberRepository;
    private final FileStorageService fileStorageService;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    //면접스터디 비디오 업로드
    @Transactional
    public String createVideo(UploadVideoRequest uploadRequest, UUID userId) throws IOException {
        UUID roomId = uploadRequest.getRoomId();
        MultipartFile file = uploadRequest.getFile();
        LocalDateTime videoStart = uploadRequest.getVideoStart();
        int  videoFps = uploadRequest.getVideoFps();

        // 존재하는 방인지 확인
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("존재하지 않는 방입니다."));

        // 파일 용량 줄이기
        // 현재는 프론트에서 줄여 보냄 -> 추후 필요시 로직 추가 예정

        // 파일 저장 path
        String filePath = fileStorageService.saveOther(file, "study"); 

        // DB에 저장
        roomMemberRepository.saveVideo(userId, roomId, filePath, videoStart, videoFps);

        return filePath;
    }

    // 면접 스터디 팀 가입
    @Transactional
    public RoomMember joinRoom(UUID roomId, UUID userId){
        // 방확인
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("존재하지 않는 방입니다."));
        // 유저확인
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("존재하지 않는 사용자입니다."));
        // 가입여부 확인
        RoomMember rm1 = roomMemberRepository.findByRoomIdAndUserId(roomId, userId);
        if (rm1 != null) throw new IllegalStateException("이미 방에 가입된 사용자입니다.");
//        if (rm1 != null) {
//            return ResponseEntity
//                    .status(HttpStatus.CONFLICT)
//                    .body("이미 방에 가입된 사용자입니다.");
//        }
        RoomMember rm = RoomMember.builder()
                .roomMemberId(new RoomMemberId(room.getId(), userId))
                .room_id(room)
                .user_id(user)
                .is_master(false)
                .build();
        RoomMember joinMember = roomMemberRepository.save(rm);
        return joinMember;
    }

}

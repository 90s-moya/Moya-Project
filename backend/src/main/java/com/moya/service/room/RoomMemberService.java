package com.moya.service.room;

import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.roommember.RoomMember;
import com.moya.domain.roommember.RoomMemberRepository;
import com.moya.interfaces.api.room.request.UploadVideoRequest;
import com.moya.support.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class RoomMemberService {

    private final RoomMemberRepository roomMemberRepository;
    private final FileStorageService fileStorageService;
    private final RoomRepository roomRepository;

    //면접스터디 비디오 업로드
    @Transactional
    public String createVideo(UploadVideoRequest uploadRequest, UUID userId) throws IOException {
        UUID roomId = uploadRequest.getRoomId();
        MultipartFile file = uploadRequest.getFile();

        // 존재하는 방인지 확인
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("존재하지 않는 방입니다."));

        // 파일 용량 줄이기
        // 현재는 프론트에서 줄여 보냄 -> 추후 필요시 로직 추가 예정

        // 파일 저장 path
        String filePath = fileStorageService.save(file);

        // DB에 저장
        roomMemberRepository.saveVideo(userId, roomId, filePath);

        return filePath;
    }

}

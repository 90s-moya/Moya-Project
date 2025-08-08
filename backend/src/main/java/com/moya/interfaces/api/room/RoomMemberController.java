package com.moya.interfaces.api.room;

import com.moya.service.room.RoomMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/room-member")
@RequiredArgsConstructor
public class RoomMemberController {

    private final RoomMemberService roomMemberService;

    @PostMapping("/upload-video")
    public ResponseEntity<String> uploadVideo(@RequestParam MultipartFile file) {
        // 비디오 용량

        // 비디오 파일 저장
        roomMemberService.createVideo(file);

        return ResponseEntity.ok("업로드 성공");
    }
}

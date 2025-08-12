package com.moya.interfaces.api.room;

import com.moya.interfaces.api.room.request.UploadVideoRequest;
import com.moya.service.room.RoomMemberService;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/v1/room-member")
@RequiredArgsConstructor
public class RoomMemberController {

    private final RoomMemberService roomMemberService;

    @PostMapping(value = "/upload-video",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadVideo(@ModelAttribute UploadVideoRequest uploadRequest, @AuthenticationPrincipal CustomUserDetails user)  throws IOException {
        MultipartFile file = uploadRequest.getFile();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("파일이 비어있습니다");
        }
        // 비디오 파일 저장
        String fileUrl = roomMemberService.createVideo(uploadRequest, user.getUserId());

        return ResponseEntity.ok(fileUrl);
    }
}

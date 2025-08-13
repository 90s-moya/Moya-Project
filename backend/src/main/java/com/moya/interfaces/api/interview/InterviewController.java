package com.moya.interfaces.api.interview;

import com.moya.interfaces.api.interview.request.UploadInterviewVideoRequest;
import com.moya.interfaces.api.room.request.UploadVideoRequest;
import com.moya.service.interview.InterviewService;
import com.moya.service.interview.command.InterviewVideoCommand;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping(value = "/v1/followup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> followup(
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("session_id") UUID sessionId,
            @RequestParam("order") int order,
            @RequestParam("sub_order") int subOrder,
            @AuthenticationPrincipal CustomUserDetails user
    ) throws IOException {
        Map<String, Object> result =
                interviewService.followupQuestion(sessionId, order, subOrder, audio);
        return ResponseEntity.ok(result);
    }
    @PostMapping(value="/v1/interview-video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<InterviewVideoCommand> uploadInterviewVideo(@ModelAttribute UploadInterviewVideoRequest uploadInterviewRequest) throws IOException{
        System.out.println("들어옴?");
        MultipartFile file = uploadInterviewRequest.getFile();
//        if (file == null || file.isEmpty()) {
//            return ResponseEntity.badRequest().body("파일이 비어있습니다");
//        }
        // 비디오 파일 저장
        InterviewVideoCommand fileUrls = interviewService.createInterviewVideo(uploadInterviewRequest);


        return ResponseEntity.ok(fileUrls);
    }

}

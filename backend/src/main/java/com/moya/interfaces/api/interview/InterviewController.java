package com.moya.interfaces.api.interview;

import com.moya.service.interview.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
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
            @AuthenticationPrincipal Object principal
    ) throws IOException {
        Map<String, Object> result =
                interviewService.followupQuestion(sessionId, order, subOrder, audio);
        return ResponseEntity.ok(result);
    }
}

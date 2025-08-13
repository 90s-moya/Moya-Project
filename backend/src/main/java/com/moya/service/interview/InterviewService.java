package com.moya.service.interview;

import com.moya.interfaces.api.interview.request.UploadInterviewVideoRequest;
import com.moya.service.interview.command.InterviewVideoCommand;
import com.moya.support.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewService {

    @Value("${PYTHON_PATH}")
    private String pythonPath;

    private final RestTemplate restTemplate;
    private final FileStorageService fileStorageService;

    public Map<String, Object> followupQuestion(
            UUID sessionId, int order, int subOrder, MultipartFile audio
    ) throws IOException {

        // --- text parts
        HttpHeaders textHeaders = new HttpHeaders();
        textHeaders.setContentType(MediaType.TEXT_PLAIN);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("session_id", new HttpEntity<>(sessionId.toString(), textHeaders));
        body.add("order",      new HttpEntity<>(String.valueOf(order), textHeaders));
        body.add("sub_order",  new HttpEntity<>(String.valueOf(subOrder), textHeaders));

        // --- file part
        String filename = (audio.getOriginalFilename() != null && !audio.getOriginalFilename().isBlank())
                ? audio.getOriginalFilename() : "audio.wav";

        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM); // 파일 파트 OK
        fileHeaders.setContentDisposition(ContentDisposition.formData().name("audio").filename(filename).build());

        ByteArrayResource resource = new ByteArrayResource(audio.getBytes()) {
            @Override public String getFilename() { return filename; }
        };
        body.add("audio", new HttpEntity<>(resource, fileHeaders));

        // --- whole request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, headers);

        ResponseEntity<Map> resp = restTemplate.exchange(
                pythonPath + "/v1/followup-question",
                HttpMethod.POST,
                req,
                Map.class
        );
        return resp.getBody();
    }

    public InterviewVideoCommand createInterviewVideo(UploadInterviewVideoRequest request, String folder) throws IOException{
        MultipartFile file = request.getFile();
        MultipartFile thumbnail = request.getThumbnail();
        String videoUrl = fileStorageService.saveOther(file, "video");
        System.out.println(videoUrl);
        // 썸네일
        String thumbnailUrl = fileStorageService.saveOther(thumbnail, "thumbnail");

        return InterviewVideoCommand.builder()
                .ThumbnailUrl(thumbnailUrl)
                .videoUrl(videoUrl)
                .build();
    }
}

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

    @Value("${STT_PATH}")
    private String sttPath;

    @Value("${VIDEO_PATH}")
    private String video_path;

    private final RestTemplate restTemplate;
    private final FileStorageService fileStorageService;
    private final AnalyzeService analyzeService;

    public Map<String, Object> followupQuestion(
            UUID sessionId, int order, int subOrder, MultipartFile audio
    ) throws IOException {
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
        fileHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        fileHeaders.setContentDisposition(ContentDisposition.formData().name("audio").filename(filename).build());

        ByteArrayResource resource = new ByteArrayResource(audio.getBytes()) {
            @Override public String getFilename() { return filename; }
        };
        body.add("audio", new HttpEntity<>(resource, fileHeaders));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, headers);

        var resp = restTemplate.exchange(
                sttPath + "/v1/followup-question",
                HttpMethod.POST,
                req,
                Map.class
        );
        return resp.getBody();
    }

    public InterviewVideoCommand createInterviewVideo(UploadInterviewVideoRequest request, String folder) throws IOException {
        MultipartFile file = request.getFile();
        MultipartFile thumbnail = request.getThumbnail();
        String sessionId = request.getInterviewSessionId().toString();

        String videoPath = fileStorageService.saveOther(file, "video/" + sessionId);
        String thumbnailPath = (thumbnail != null) ? fileStorageService.saveOther(thumbnail, "thumbnail/" + sessionId) : null;

        String videoUrl = toAbsoluteUrl(videoPath);
        String thumbnailUrl = toAbsoluteUrl(thumbnailPath);

        System.out.println("[upload] videoUrl=" + videoUrl);
        if (thumbnailUrl != null) {
            System.out.println("[upload] thumbnailUrl=" + thumbnailUrl);
        }


        if (request.getInterviewSessionId() != null) {
            Integer stride = (request.getStride() != null) ? request.getStride() : 5;
            String device = (request.getDevice() != null) ? request.getDevice() : "cuda";
            boolean returnPoints = Boolean.TRUE.equals(request.getReturnPoints());

            Integer order = toIntOrNull(String.valueOf(request.getOrder()));
            Integer subOrder = toIntOrNull(String.valueOf(request.getSubOrder()));
            String calibDataJson = request.getCalibDataJson();

            if (order != null && subOrder != null) {
                analyzeService.sendAnalyzeByUrlAsync(
                        request.getInterviewSessionId(),
                        order,
                        subOrder,
                        videoUrl,
                        device,
                        stride,
                        returnPoints,
                        calibDataJson,
                        thumbnailUrl
                );
            } else {
                System.err.println("[analyze] skip: order/subOrder parse 실패");
            }
        }        if (request.getInterviewSessionId() != null) {
            Integer stride = (request.getStride() != null) ? request.getStride() : 5;
            String device = (request.getDevice() != null) ? request.getDevice() : "cuda";
            boolean returnPoints = Boolean.TRUE.equals(request.getReturnPoints());

            Integer order = toIntOrNull(String.valueOf(request.getOrder()));
            Integer subOrder = toIntOrNull(String.valueOf(request.getSubOrder()));
            String calibDataJson = request.getCalibDataJson();
            if (order != null && subOrder != null) {
                sendAnalyzeByUrlAsync(
                        request.getInterviewSessionId(),
                        order,
                        subOrder,
                        videoUrl,
                        device,
                        stride,
                        returnPoints,
                        calibDataJson,
                        thumbnailUrl
                );
            } else {
                System.err.println("[analyze] skip: order/subOrder parse 실패 (order="
                        + request.getOrder() + ", subOrder=" + request.getSubOrder() + ")");
            }
        }

        return InterviewVideoCommand.builder()
                .ThumbnailUrl(thumbnailUrl)
                .videoUrl(videoUrl)
                .build();
    }

    private String toAbsoluteUrl(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) return pathOrUrl;
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
        String base = (video_path != null) ? video_path.replaceAll("/+$", "") : "";
        String p = pathOrUrl.startsWith("/") ? pathOrUrl : ("/" + pathOrUrl);
        return base + p;
    }

    private Integer toIntOrNull(String s) {
        try {
            return (s == null || s.isBlank()) ? null : Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

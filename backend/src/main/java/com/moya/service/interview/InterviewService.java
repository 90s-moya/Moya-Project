package com.moya.service.interview;

import com.moya.interfaces.api.interview.request.UploadInterviewVideoRequest;
import com.moya.service.interview.command.InterviewVideoCommand;
import com.moya.support.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
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


    @Value("${VIDEO_PATH}")
    private String video_path;

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
        fileHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
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

        var resp = restTemplate.exchange(
                pythonPath + "/v1/followup-question",
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

        // 1) 파일 저장 (보통 상대경로 반환: /files-dev/video/xxx.webm)
        String videoPath = fileStorageService.saveOther(file, "video/"+sessionId);
        String thumbnailPath = (thumbnail != null) ? fileStorageService.saveOther(thumbnail, "thumbnail/"+sessionId) : null;

        // 2) 절대 URL로 보정
        String videoUrl = toAbsoluteUrl(videoPath);
        String thumbnailUrl = toAbsoluteUrl(thumbnailPath);

        System.out.println("[upload] videoUrl=" + videoUrl);
        if (thumbnailUrl != null) {
            System.out.println("[upload] thumbnailUrl=" + thumbnailUrl);
        }

        // 3) 분석 트리거 (URL 방식) — STT는 여기서 절대 호출하지 않음
        if (request.getInterviewSessionId() != null) {
            Integer stride = (request.getStride() != null) ? request.getStride() : 5;
            String device = (request.getDevice() != null) ? request.getDevice() : "cpu";
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

        // 4) 응답: 저장된 URL들만 반환
        return InterviewVideoCommand.builder()
                .ThumbnailUrl(thumbnailUrl)
                .videoUrl(videoUrl)
                .build();
    }

    @Async
    public void sendAnalyzeByUrlAsync(
            UUID sessionId,
            int order,
            int subOrder,
            String videoUrl,
            String device,
            int stride,
            boolean returnPoints,
            String calibDataJson,
            String thumbnailUrl
    ) {
        try {
            String resolved = toAbsoluteUrl(videoUrl); // 안전차원으로 한 번 더 보정
            System.out.println("[analyze async] video_url=" + resolved);

            HttpHeaders text = new HttpHeaders();
            text.setContentType(MediaType.TEXT_PLAIN);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("video_url",     new HttpEntity<>(resolved, text));
            body.add("session_id",    new HttpEntity<>(sessionId.toString(), text));
            body.add("order",         new HttpEntity<>(String.valueOf(order), text));
            body.add("sub_order",     new HttpEntity<>(String.valueOf(subOrder), text));
            body.add("device",        new HttpEntity<>(device, text));
            body.add("stride",        new HttpEntity<>(String.valueOf(stride), text));
            body.add("return_points", new HttpEntity<>(String.valueOf(returnPoints), text));
            if (thumbnailUrl != null && !thumbnailUrl.isBlank()) {
                body.add("thumbnail_url", new HttpEntity<>(thumbnailUrl, text));
            }

            if (calibDataJson != null && !calibDataJson.isBlank()) {
                HttpHeaders jsonHeaders = new HttpHeaders();
                jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
                // 로그는 길이만 출력
                System.out.println("[calib_data] length=" + calibDataJson.length());
                body.add("calib_data", new HttpEntity<>(calibDataJson, jsonHeaders));
            }


            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

            restTemplate.exchange(
                    pythonPath + "/v1/analyze/complete-by-url",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (Exception e) {
            System.err.println("[analyze async] " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    //경로 변환
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

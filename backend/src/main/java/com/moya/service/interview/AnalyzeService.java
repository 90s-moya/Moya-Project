package com.moya.service.interview;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyzeService {

    private final RestTemplate restTemplate;

    @Value("${PYTHON_PATH}")
    private String pythonPath;

    @Value("${VIDEO_PATH}")
    private String videoPath;

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
            String resolved = toAbsoluteUrl(videoUrl);
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

    private String toAbsoluteUrl(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) return pathOrUrl;
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
        String base = (videoPath != null) ? videoPath.replaceAll("/+$", "") : "";
        String p = pathOrUrl.startsWith("/") ? pathOrUrl : ("/" + pathOrUrl);
        return base + p;
    }
}

package com.moya.service.pdf;

import com.moya.domain.docs.DocsStatus;
import com.moya.support.exception.BusinessException;
import com.moya.support.file.PdfTextExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import static com.moya.support.exception.BusinessError.*;

@Service
@RequiredArgsConstructor
public class PDFService {

    private final RestTemplate restTemplate;

    @Value("${STT_PATH}")
    private String pythonPath;

    // 공통 호출 메서드: 파이썬 응답을 그대로 리턴
    private ResponseEntity<String> postPromptStart(String userId, String text) {
        Map<String, Object> body = Map.of("userId", userId, "text", text);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
        try {
            return restTemplate.exchange(
                    pythonPath + "/v1/prompt-start",
                    HttpMethod.POST,
                    req,
                    String.class
            );
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            // 4xx/5xx여도 FastAPI의 JSON 바디를 그대로 전달
            return ResponseEntity
                    .status(e.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(e.getResponseBodyAsString());
        }
    }


    public ResponseEntity<String> getTextBatch(
            String userId, String resumeUrl, String portfolioUrl, String coverletterUrl
    ) {
        Map<DocsStatus, String> urls = new EnumMap<>(DocsStatus.class);

        // isBlank() 강화: "null", "undefined" 문자열도 필터
        if (!isBlank(resumeUrl)) urls.put(DocsStatus.RESUME, resumeUrl);
        if (!isBlank(portfolioUrl)) urls.put(DocsStatus.PORTFOLIO, portfolioUrl);
        if (!isBlank(coverletterUrl)) urls.put(DocsStatus.COVERLETTER, coverletterUrl);

        if (urls.isEmpty()) {
            throw PDF_GET_URL_ERROR.exception();
        }

        try {
            var futures = urls.entrySet().stream()
                    .map(e -> CompletableFuture.supplyAsync(() -> {
                        try {
                            String text = PdfTextExtractor.extractTextFromUrl(e.getValue());
                            return Map.entry(e.getKey(), Optional.of(text));
                        } catch (IOException ex) {
                            // 실패는 Optional.empty()로 표시
                            return Map.entry(e.getKey(), Optional.<String>empty());
                        }
                    }))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            // 성공한 PDF만 병합
            String merged = futures.stream()
                    .map(CompletableFuture::join)
                    .filter(e -> e.getValue().isPresent()) // 성공한 경우만
                    .sorted(Comparator.comparing(e -> e.getKey().ordinal()))
                    .map(e -> "==== " + e.getKey().name() + " ====\n" + e.getValue().get())
                    .collect(Collectors.joining("\n\n"));

            if (merged.isEmpty()) {
                throw PDF_GET_TEXT_FAIL.exception();
            }

            // 파이썬 서버로 전송
            return postPromptStart(userId, merged);

        } catch (UncheckedIOException e) {
            throw PDF_FAIL_TEXT.exception();
        }
    }

    private boolean isBlank(String s) {
        if (s == null) return true;
        String t = s.trim();
        return t.isEmpty()
                || "null".equalsIgnoreCase(t)
                || "undefined".equalsIgnoreCase(t);
    }
}
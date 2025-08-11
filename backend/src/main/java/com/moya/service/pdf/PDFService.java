package com.moya.service.pdf;

import com.moya.domain.docs.DocsStatus;
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

@Service
@RequiredArgsConstructor
public class PDFService {

    private final RestTemplate restTemplate;

    @Value("${PYTHON_PATH}")
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


    // 배치(이력서/포폴/자소서)
    public ResponseEntity<String> getTextBatch(
            String userId, String resumeUrl, String portfolioUrl, String coverletterUrl
    ) {
        Map<DocsStatus, String> urls = new EnumMap<>(DocsStatus.class);
        if (!isBlank(resumeUrl))     urls.put(DocsStatus.RESUME,     resumeUrl);
        if (!isBlank(portfolioUrl))  urls.put(DocsStatus.PORTFOLIO,  portfolioUrl);
        if (!isBlank(coverletterUrl))urls.put(DocsStatus.COVERLETTER,coverletterUrl);
        if (urls.isEmpty()) throw new IllegalArgumentException("유효한 PDF URL이 없습니다.");

        try {
            var futures = urls.entrySet().stream()
                    .map(e -> CompletableFuture.supplyAsync(() -> {
                        try {
                            String text = PdfTextExtractor.extractTextFromUrl(e.getValue());
                            return Map.entry(e.getKey(), text);
                        } catch (IOException ex) {
                            throw new UncheckedIOException(ex);
                        }
                    }))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            String merged = futures.stream()
                    .map(CompletableFuture::join)
                    .sorted(Comparator.comparing(e -> e.getKey().ordinal()))
                    .map(e -> "==== " + e.getKey().name() + " ====\n" + e.getValue())
                    .collect(Collectors.joining("\n\n"));

            // 파이썬으로 전송하고, 그 응답(성공/에러)을 그대로 반환
            return postPromptStart(userId, merged);

        } catch (UncheckedIOException e) {
            throw new RuntimeException("PDF 병렬 추출 중 I/O 오류: " + e.getCause().getMessage(), e);
        }
    }

    private boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }
}
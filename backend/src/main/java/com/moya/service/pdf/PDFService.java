package com.moya.service.pdf;

import com.moya.domain.docs.DocsStatus;
import com.moya.support.file.PdfTextExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    private String PythonPath;

    public String getText(String userId, String fileURL) {
        try {
            String endpointUrl = PythonPath + "/v1/prompt-start";

            String text = PdfTextExtractor.extractTextFromUrl(fileURL);

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("userId", userId);
            requestBody.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            restTemplate.postForObject(endpointUrl, request, String.class);
            return text;
        } catch (Exception e) {
            throw new RuntimeException("PDF 텍스트 추출 실패: " + e.getMessage(), e);
        }
    }
   //3개 추출
    public String getTextBatch(
            String userId,
            String resumeUrl,
            String portfolioUrl,
            String coverletterUrl
    ) {
        // 들어온 것만 필터링
        Map<DocsStatus, String> urls = new EnumMap<>(DocsStatus.class);
        if (!isBlank(resumeUrl)) urls.put(DocsStatus.RESUME, resumeUrl);
        if (!isBlank(portfolioUrl)) urls.put(DocsStatus.PORTFOLIO, portfolioUrl);
        if (!isBlank(coverletterUrl)) urls.put(DocsStatus.COVERLETTER, coverletterUrl);

        if (urls.isEmpty()) {
            throw new IllegalArgumentException("유효한 PDF URL이 없습니다.");
        }

        try {
            String endpointUrl = PythonPath + "/v1/prompt-start";

            // 병렬 추출 (IOException -> UncheckedIOException으로 래핑)
            List<CompletableFuture<Map.Entry<DocsStatus, String>>> futures = urls.entrySet().stream()
                    .map(e -> CompletableFuture.supplyAsync(() -> {
                        try {
                            String text = PdfTextExtractor.extractTextFromUrl(e.getValue());
                            return Map.entry(e.getKey(), text);
                        } catch (IOException ex) {
                            // 하나 실패 시 전체를 중단하고 싶으면 래핑해서 throw
                            // 개별 실패 무시하고 싶다면 아래 "느슨한 모드" 참고
                            throw new UncheckedIOException(ex);
                        }
                    }))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            // ENUM 순서대로 정렬해서 머지
            String merged = futures.stream()
                    .map(CompletableFuture::join)
                    .sorted(Comparator.comparing(e -> e.getKey().ordinal()))
                    .map(e -> "==== " + e.getKey().name() + " ====\n" + e.getValue())
                    .collect(Collectors.joining("\n\n"));

            // 한 번에 POST
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("userId", userId);
            requestBody.put("text", merged);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            restTemplate.postForObject(endpointUrl, request, String.class);

            return merged;
        } catch (UncheckedIOException e) {
            // 위에서 래핑한 IOException 처리
            throw new RuntimeException("PDF 병렬 추출 중 I/O 오류: " + e.getCause().getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("PDF 배치 텍스트 추출 실패: " + e.getMessage(), e);
        }
    }

    // 필요 시: 하나 실패해도 나머지는 진행하는 "느슨한 모드"
    public String getTextBatchLenient(
            String userId,
            String resumeUrl,
            String portfolioUrl,
            String coverletterUrl
    ) {
        Map<DocsStatus, String> urls = new EnumMap<>(DocsStatus.class);
        if (!isBlank(resumeUrl)) urls.put(DocsStatus.RESUME, resumeUrl);
        if (!isBlank(portfolioUrl)) urls.put(DocsStatus.PORTFOLIO, portfolioUrl);
        if (!isBlank(coverletterUrl)) urls.put(DocsStatus.COVERLETTER, coverletterUrl);
        if (urls.isEmpty()) throw new IllegalArgumentException("유효한 PDF URL이 없습니다.");

        try {
            String endpointUrl = PythonPath + "/v1/prompt-start";

            List<CompletableFuture<Map.Entry<DocsStatus, String>>> futures = urls.entrySet().stream()
                    .map(e -> CompletableFuture.supplyAsync(() -> {
                        try {
                            String text = PdfTextExtractor.extractTextFromUrl(e.getValue());
                            return Map.entry(e.getKey(), text);
                        } catch (IOException ex) {
                            // 실패한 문서는 빈 텍스트로 대체 (로그 추천)
                            return Map.entry(e.getKey(), "");
                        }
                    }))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            String merged = futures.stream()
                    .map(CompletableFuture::join)
                    .sorted(Comparator.comparing(e -> e.getKey().ordinal()))
                    .map(e -> "==== " + e.getKey().name() + " ====\n" + e.getValue())
                    .collect(Collectors.joining("\n\n"));

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("userId", userId);
            requestBody.put("text", merged);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            restTemplate.postForObject(endpointUrl, request, String.class);

            return merged;
        } catch (Exception e) {
            throw new RuntimeException("PDF 배치 텍스트 추출 실패(느슨 모드): " + e.getMessage(), e);
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}

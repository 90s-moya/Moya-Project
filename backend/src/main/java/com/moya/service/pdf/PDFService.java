package com.moya.service.pdf;

import com.moya.support.file.PdfTextExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders; // ✅ 여기 수정
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PDFService {
    private final RestTemplate restTemplate;

    @Value("${PYTHON_PATH}")
    private String PythonPath;

    public String getText(String userId, String fileURL) {
        try {
            String endpointUrl = PythonPath + "/v1/prompt-start";

            // PDF에서 텍스트 추출
            String text = PdfTextExtractor.extractTextFromUrl(fileURL);

            // userId + text JSON body 구성
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("userId", userId);
            requestBody.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            // FastAPI로 전송
            restTemplate.postForObject(endpointUrl, request, String.class);

            return text;
        } catch (Exception e) {
            throw new RuntimeException("PDF 텍스트 추출 실패: " + e.getMessage());
        }
    }
}

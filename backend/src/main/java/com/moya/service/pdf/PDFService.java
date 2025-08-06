package com.moya.service.pdf;

import com.moya.support.file.PdfTextExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class PDFService {
    private final RestTemplate restTemplate;
    // PDF 내 Text 추출
    public String getText(String fileURL) {
        try{
            String endpointUrl = "http://localhost:8000/v1/prompt-stt/";
            String text = PdfTextExtractor.extractTextFromUrl(fileURL);
            restTemplate.postForObject(endpointUrl, text, String.class);
            return text;
        } catch(Exception e){
            throw new RuntimeException("PDF 텍스트 추출 실패: "+e.getMessage());
        }
    }
}

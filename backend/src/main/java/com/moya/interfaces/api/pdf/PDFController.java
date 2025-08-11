package com.moya.interfaces.api.pdf;

import com.moya.interfaces.api.pdf.request.PDFRequest;
import com.moya.service.pdf.PDFService;
import com.moya.support.security.auth.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/pdf")
@RequiredArgsConstructor
public class PDFController {
    private final PDFService pdfService;
    @PostMapping
    public ResponseEntity<String> selectPDFTextBatch(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PDFRequest request
    ) {
        String userId = user.getUserId().toString();

        String merged = pdfService.getTextBatch (
                userId,
                request.getResumeUrl(),
                request.getPortfolioUrl(),
                request.getCoverletterUrl()
        );
        return ResponseEntity.ok(merged);
    }
}
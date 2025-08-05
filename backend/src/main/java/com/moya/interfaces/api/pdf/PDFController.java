package com.moya.interfaces.api.pdf;

import com.moya.interfaces.api.pdf.request.PDFRequest;
import com.moya.service.pdf.PDFService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/pdf")
@RequiredArgsConstructor
public class PDFController {
    private final PDFService pdfService;
    @PostMapping()
    public ResponseEntity<String> selectPDFText(@RequestBody PDFRequest request){
        String text = pdfService.getText(request.getFileURL());
        System.out.println(text);
        return ResponseEntity.ok(text);
    }
}

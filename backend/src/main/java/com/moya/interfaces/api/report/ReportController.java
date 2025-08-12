package com.moya.interfaces.api.report;
// src/main/java/com/example/reports/controller/ReportController.java


import com.moya.infras.report.ReportDto;
import com.moya.infras.report.ResultDto;
import com.moya.service.report.ReportService;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Currency;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/me/report")
public class ReportController {

    private final ReportService service;



    // React → GET /api/reports?userId=...
    @GetMapping
    public ResponseEntity<List<ReportDto>> listReports(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(service.fetchReportsByUser(user.getUserId().toString()));
    }

//    // React → GET /api/reports/{reportId}?userId=...
//    @GetMapping("/{reportId}")
//    public ResponseEntity<ReportDto> getReport(@PathVariable String reportId, @AuthenticationPrincipal CustomUserDetails user) {
//        return ResponseEntity.ok(service.fetchReportById(user.getUserId().toString(), reportId));
//    }

    // React → GET /api/reports/results/{resultId}?userId=...
    // (reportId 없이 resultId만으로 단건 조회)
    @GetMapping("/{resultId}")
    public ResponseEntity<ResultDto> getResult(@PathVariable String resultId, @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(service.fetchResultById(user.getUserId().toString(), resultId));
    }
}

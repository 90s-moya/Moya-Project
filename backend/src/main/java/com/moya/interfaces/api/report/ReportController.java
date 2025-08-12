package com.moya.interfaces.api.report;
// src/main/java/com/example/reports/controller/ReportController.java


import com.moya.infras.report.ReportDto;
import com.moya.infras.report.ResultDetailResponse;
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

    private final ReportService reportService;



    // React → GET /api/reports?userId=...
    @GetMapping
    public ResponseEntity<List<ReportDto>> listReports(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(reportService.fetchReportsByUser(user.getUserId().toString()));
    }

//    // React → GET /api/reports/{reportId}?userId=...
//    @GetMapping("/{reportId}")
//    public ResponseEntity<ReportDto> getReport(@PathVariable String reportId, @AuthenticationPrincipal CustomUserDetails user) {
//        return ResponseEntity.ok(service.fetchReportById(user.getUserId().toString(), reportId));
//    }

    // React → GET /api/reports/results/{resultId}?userId=...
    // (reportId 없이 resultId만으로 단건 조회)
//    @GetMapping("/")
//    public ResponseEntity<ResultDto> getMyReportResult(@RequestParam("resultId") String resultId) {
//        return ResponseEntity.ok(reportService.fetchResultById(resultId));
//    }
    // 예: /v1/me/report/detail?resultId=...
    @GetMapping("/")
    public ResponseEntity<ResultDetailResponse> getMyReportDetail(@RequestParam String resultId,@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(reportService.fetchResultDetailById(resultId));
    }
}

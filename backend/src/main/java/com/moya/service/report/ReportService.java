package com.moya.service.report;


import java.net.URI;
import java.util.List;
import java.util.NoSuchElementException;

import com.moya.infras.report.ReportDto;
import com.moya.infras.report.ResultDto;
import com.moya.interfaces.api.report.UserIdRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ReportService {

    @Value("${PYTHON_PATH}") // FastAPI 베이스 URL
    private String pythonPath;

    private final RestTemplate restTemplate;

    public ReportService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** FastAPI: POST /reports  (body: {"user_id": "..."} ), 응답: List<ReportDto> */
    public List<ReportDto> fetchReportsByUser(String userId) {
        URI uri = URI.create(pythonPath + "/reports");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<UserIdRequest> req = new HttpEntity<>(new UserIdRequest(userId), headers);

        ResponseEntity<List<ReportDto>> resp = restTemplate.exchange(
                uri, HttpMethod.POST, req,
                new ParameterizedTypeReference<List<ReportDto>>() {}
        );
        return resp.getBody();
    }

    /** 단일 리포트 조회(임시: 목록에서 필터) — FastAPI에 GET /reports/{id} 추가되면 그걸 사용 */
    public ReportDto fetchReportById(String userId, String reportId) {
        List<ReportDto> list = fetchReportsByUser(userId);
        return list.stream()
                .filter(r -> reportId.equals(r.getReportId()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Report not found"));
    }

    /** 단일 결과 조회(임시) — FastAPI에 단건 API 추가 권장 */
    public ResultDto fetchResultById(String userId, String resultId) {
        List<ReportDto> list = fetchReportsByUser(userId);
        return list.stream()
                .flatMap(r -> r.getResults().stream())
                .filter(res -> resultId.equals(res.getResultId()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Result not found"));
    }
}

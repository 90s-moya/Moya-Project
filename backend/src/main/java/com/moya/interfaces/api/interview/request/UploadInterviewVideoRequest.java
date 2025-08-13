package com.moya.interfaces.api.interview.request;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Setter
@Getter
public class UploadInterviewVideoRequest {
    private MultipartFile file;
    private UUID interviewSessionId;
    private String order;
    private String subOrder;
}

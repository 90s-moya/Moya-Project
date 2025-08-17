package com.moya.interfaces.api.interview.request;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Setter
@Getter
public class UploadInterviewVideoRequest {
    private MultipartFile file;
    private MultipartFile thumbnail;
    private UUID interviewSessionId;
    private Integer order;
    private Integer subOrder;
    private String calibDataJson;

    // 옵션 (기본값)
    private String device = "cuda";
    private Integer stride = 5;
    private Boolean returnPoints = false;

}

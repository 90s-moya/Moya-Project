package com.moya.interfaces.api.room.request;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.UUID;

@Setter
@Getter
public class UploadVideoRequest {
    private MultipartFile file;
    private UUID roomId;
    private LocalDateTime videoStart;
    private int videoFps;
}

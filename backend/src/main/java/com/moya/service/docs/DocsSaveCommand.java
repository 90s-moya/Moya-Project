package com.moya.service.docs;

import com.moya.domain.docs.DocsStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
@Getter
@NoArgsConstructor
public class DocsSaveCommand {

    private UUID userId;
    private DocsStatus docsStatus;
    private MultipartFile file;
    private String fileUrl;

    public DocsSaveCommand(UUID userId, DocsStatus docsStatus, MultipartFile file, String fileUrl) {
        this.userId = userId;
        this.docsStatus = docsStatus;
        this.file = file;
        this.fileUrl = fileUrl;
    }
}

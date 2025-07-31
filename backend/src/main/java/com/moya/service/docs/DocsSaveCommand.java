package com.moya.service.docs;

import com.moya.domain.docs.DocsStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
public class DocsSaveCommand {
    private UUID userId;
    private String fileUrl;
    private DocsStatus docsStatus;

    public DocsSaveCommand(UUID userId,String fileUrl,DocsStatus docsStatus){
        this.userId=userId;
        this.fileUrl=fileUrl;
        this.docsStatus=docsStatus;
    }
}

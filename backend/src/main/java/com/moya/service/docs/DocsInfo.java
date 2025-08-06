package com.moya.service.docs;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsStatus;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
public class DocsInfo {
    private UUID docsId;
    private UUID userId;
    private String fileUrl;
    private DocsStatus docsStatus;

    @Builder
    private DocsInfo(UUID docsId, UUID userId,String fileUrl, DocsStatus docsStatus){
        this.docsId=docsId;
        this.userId=userId;
        this.fileUrl=fileUrl;
        this.docsStatus=docsStatus;

    }
    @Builder
    public static DocsInfo from(Docs docs){
        return DocsInfo.builder()
                .docsId(docs.getId())
                .userId(docs.getUserId())
                .fileUrl(docs.getFileUrl())
                .docsStatus(docs.getDocsStatus())
                .build();

    }

}

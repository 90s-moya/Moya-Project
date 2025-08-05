package com.moya.service.docs;

import lombok.Getter;

import java.util.UUID;

@Getter
public class DocsCommand {
    private UUID docsId;
    private UUID userId;

    public DocsCommand(UUID docsId,UUID userId){
        this.docsId=docsId;
        this.userId=userId;
    }
}

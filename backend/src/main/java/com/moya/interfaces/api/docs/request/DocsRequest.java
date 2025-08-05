package com.moya.interfaces.api.docs.request;

import com.moya.service.docs.DocsCommand;
import lombok.Getter;

import java.util.UUID;

@Getter
public class DocsRequest {
    private UUID docsId;

    public DocsRequest(UUID docsId){this.docsId=docsId;}
    public DocsCommand toCommand(UUID userId){


        return new DocsCommand(userId,docsId);
    }
}

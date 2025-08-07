package com.moya.service.docs;

import lombok.Getter;

import java.util.UUID;

@Getter
public class GetDocsCommand {
    private UUID userId;

    public GetDocsCommand(UUID userId){
        this.userId=userId;
    }

}

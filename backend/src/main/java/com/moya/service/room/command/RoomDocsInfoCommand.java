package com.moya.service.room.command;

import com.moya.domain.docs.DocsStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoomDocsInfoCommand {
    private UUID docsId;
    private UUID userId;
    private String fileUrl;
    private DocsStatus docsStatus;
}

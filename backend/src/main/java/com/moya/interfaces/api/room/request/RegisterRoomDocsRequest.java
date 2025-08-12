package com.moya.interfaces.api.room.request;

import lombok.*;

import java.util.UUID;

@ToString
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Setter
public class RegisterRoomDocsRequest {
    private UUID resumeId;
    private UUID portfolioId;
    private UUID coverletterId;
}

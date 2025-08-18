package com.moya.service.room.command;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class MasterInfo {
    private String nickname;
    private int makeRoomCnt;
    private LocalDateTime createdAt;
    private UUID masterId;
}

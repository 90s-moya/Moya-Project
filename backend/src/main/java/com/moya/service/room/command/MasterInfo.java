package com.moya.service.room.command;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MasterInfo {
    private String nickname;
    private int makeRoomCnt;
    private LocalDateTime createdAt;
}

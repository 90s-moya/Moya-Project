package com.moya.service.room.command;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class RoomDetailCommand {
    private String title;
    private String body;
    private int maxUser;
    private LocalDateTime openAt;
    private LocalDateTime expiredAt;
    private String categoryName;
    private List<String> joinUsers;
    private MasterInfo masterInfo;
}

package com.moya.service.room.command;

import com.moya.domain.room.Room;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class RoomInfoCommand {
    private UUID id;
    private String title;
    private String body;
    private int maxUser;
    private int joinUser;
    private LocalDateTime expiredAt;
    private LocalDateTime openAt;
    private LocalDateTime createdAt;
    private String categoryName;
    private LocalDateTime videoStart;

    public static RoomInfoCommand from(Room room, int joinMemberCount) {
        return RoomInfoCommand.builder()
                .id(room.getId())
                .title(room.getTitle())
                .body(room.getBody())
                .maxUser(room.getMaxUser())
                .joinUser(joinMemberCount)
                .expiredAt(room.getExpiredAt())
                .openAt(room.getOpenAt())
                .createdAt(room.getCreatedAt())
                .categoryName(room.getCategoryId().getName())
                .build();
    }
}

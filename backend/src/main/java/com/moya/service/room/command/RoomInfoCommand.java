package com.moya.service.room.command;

import com.moya.domain.room.Room;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class RoomInfoCommand {
    private UUID id;
    private String title;
    private String body;
    private String conversation;
    private int maxUser;
    private LocalDateTime expiredAt;
    private LocalDateTime openAt;
    private String categoryName;

    @Builder
    private RoomInfoCommand(UUID id, String title, String body, String conversation,
                            int maxUser, LocalDateTime expiredAt, LocalDateTime openAt,
                            String categoryName) {
        this.id = id;
        this.title = title;
        this.body = body;
        this.conversation = conversation;
        this.maxUser = maxUser;
        this.expiredAt = expiredAt;
        this.openAt = openAt;
        this.categoryName = categoryName;
    }

    public static RoomInfoCommand from(Room room) {
        return RoomInfoCommand.builder()
                .id(room.getId())
                .title(room.getTitle())
                .body(room.getBody())
                .conversation(room.getConversation())
                .maxUser(room.getMaxUser())
                .expiredAt(room.getExpiredAt())
                .openAt(room.getOpenAt())
                .categoryName(room.getCategoryId().getName())
                .build();
    }
}

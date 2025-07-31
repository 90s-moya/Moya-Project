package com.moya.service.room;

import com.moya.domain.room.Room;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class RoomInfo {
    private UUID id;
    private String title;
    private String body;
    private String conversation;
    private int maxUser;
    private LocalDateTime expiredAt;
    private LocalDateTime openAt;
    private String categoryName;

    @Builder
    private RoomInfo(UUID id, String title, String body, String conversation,
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

    public static RoomInfo from(Room room) {
        return RoomInfo.builder()
                .id(room.getId())
                .title(room.getTitle())
                .body(room.getBody())
                .conversation(room.getConversation())
                .maxUser(room.getMax_user())
                .expiredAt(room.getExpired_at())
                .openAt(room.getOpen_at())
                .categoryName(room.getCategory_id().getName()) // 주의: LAZY 초기화 필요
                .build();
    }
}

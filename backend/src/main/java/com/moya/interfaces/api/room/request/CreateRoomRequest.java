package com.moya.interfaces.api.room.request;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.UUID;

@ToString
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomRequest {
    private UUID category_id;
    private int max_user;
    private String title;
    private String body;
    private LocalDateTime open_at;
    private LocalDateTime expired_at;
}

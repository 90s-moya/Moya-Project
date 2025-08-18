package com.moya.domain.roommember;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor
public class RoomMemberId implements Serializable {
    // 복합키 설정을 위한 클래스
    private UUID room_id;
    private UUID user_id;
}

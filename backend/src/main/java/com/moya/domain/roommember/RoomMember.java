package com.moya.domain.roommember;

import com.moya.domain.BaseEntity;
import com.moya.domain.room.Room;
import com.moya.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomMember extends BaseEntity {
    @EmbeddedId
    private RoomMemberId roomMemberId;
    //복합키 설정
    //MapsId는 Jpa에서 EmbeddedId를 사용할 때 연관관계 필드를 연결하기 위해 사용
    @MapsId("room_id")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", referencedColumnName = "room_id")
    private Room room_id;
    @MapsId("user_id")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private User user_id;
    @Column
    private boolean is_master;
}

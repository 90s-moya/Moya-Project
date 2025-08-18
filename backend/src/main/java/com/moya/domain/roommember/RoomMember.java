package com.moya.domain.roommember;

import com.moya.domain.BaseEntity;
import com.moya.domain.room.Room;
import com.moya.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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
    // 화면 녹화 저장을 위한 video_url 추가
    private String video_url;
    // 화면 녹화 시작 시 시간
    private LocalDateTime video_start;
    // 비디오 fps
    private int video_fps;
}

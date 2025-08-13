package com.moya.domain.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface RoomRepository extends JpaRepository<Room, UUID> {
    // 내가 참여한 방 조회
    @Query(value = """
    SELECT 
      r
    FROM Room r
    JOIN RoomMember rm ON r.id = rm.room_id.id
    WHERE rm.user_id.id = :userId
    AND rm.video_url IS NOT NULL
    """)
    List<Room> findMyDoneRoom(UUID userId);

    // 내가 참여한 방 조회
    @Query(value = """
    SELECT 
      r
    FROM Room r
    JOIN RoomMember rm ON r.id = rm.room_id.id
    WHERE rm.user_id.id = :userId
    AND rm.video_url IS NULL
    """)
    List<Room> findMyTodoRoom(UUID userId);
}

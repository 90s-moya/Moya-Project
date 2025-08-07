package com.moya.domain.roommember;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {
    @Query("SELECT rm FROM RoomMember rm JOIN FETCH rm.user_id WHERE rm.room_id.id = :room_id")
    List<RoomMember> findByRoomId(UUID room_id);

    @Query("SELECT COUNT(rm) FROM RoomMember rm WHERE rm.user_id.id = :user_id AND rm.is_master = true")
    int countMasterRoomsByUserId(UUID user_id);

    @Query("SELECT COUNT(rm) FROM RoomMember rm where rm.room_id.id = :room_id")
    int countByRoom(UUID room_id);

    @Modifying
    @Query("DELETE FROM RoomMember rm where rm.room_id.id = :room_id")
    void deleteRoomMember(UUID room_id);

    @Query("SELECT rm from RoomMember rm where rm.room_id.id = :room_id and rm.user_id.id = :user_id")
    RoomMember findByRoomIdAndUserId(UUID room_id, UUID user_id);
}

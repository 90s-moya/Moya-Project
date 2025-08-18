package com.moya.domain.feedback;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    @Query("select f from Feedback f where f.receiver.id = :userId and f.room.id = :roomId order by f.createdAt")
    List<Feedback> findByUserIdAndRoomId(UUID userId, UUID roomId);
}

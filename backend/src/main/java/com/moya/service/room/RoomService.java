package com.moya.service.room;

import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {
    private final RoomRepository roomRepository;
    // 면접 스터디 전체 조회
    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }
    // 면접 스터디 방 삭제
    @Transactional
    public void deleteRoom(UUID room_id) {
        roomRepository.deleteById(room_id);
    }
}

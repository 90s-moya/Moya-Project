package com.moya.interfaces.api.room;

import com.moya.domain.room.Room;
import com.moya.service.room.RoomInfo;
import com.moya.service.room.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/room")
@RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;
    // 면접 스터디 전체 방 조회
    @GetMapping()
    public List<RoomInfo> getAllRooms() {
        return roomService.getAllRooms().stream()
                .map(RoomInfo::from)
                .toList();
    }

    // 면접 스터디 방 삭제
    @DeleteMapping("/{roomId}")
    public void deleteRoom(@PathVariable UUID roomId) {
        // TODO: 존재하는 방인지 확인하는 로직 추가 해야함
        // TODO: 삭제 완료 여부 BOOLEAN 받을지 말지 고민
        roomService.deleteRoom(roomId);
        // TODO: 성공여부 리턴
    }
}

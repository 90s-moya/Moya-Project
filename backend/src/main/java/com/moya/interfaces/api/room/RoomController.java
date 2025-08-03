package com.moya.interfaces.api.room;

import com.moya.service.room.command.RoomDetailCommand;
import com.moya.service.room.command.RoomInfoCommand;
import com.moya.service.room.RoomService;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.moya.interfaces.api.room.request.CreateRoomRequest;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/room")
@RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;
    // 면접 스터디 전체 방 조회
    @GetMapping()
    public List<RoomInfoCommand> getAllRooms() {
        return roomService.getAllRooms().stream()
                .map(RoomInfoCommand::from)
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

    // 면접 스터디 방 상세 조회
    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDetailCommand> getRoom(@PathVariable UUID roomId) {
        RoomDetailCommand rdc = roomService.getRoomDetail(roomId);
        return ResponseEntity.ok(rdc);
    }

    // 면접 스터디 방 생성
    @PostMapping()
    public UUID createRoom(@RequestBody CreateRoomRequest createRoomRequest, @AuthenticationPrincipal CustomUserDetails user) {
        // 방 만들고
        System.out.println("===============================들어오셈==================");
        UUID roomId = roomService.createRoom(createRoomRequest, user.getUserId());
        return roomId;
    }
}
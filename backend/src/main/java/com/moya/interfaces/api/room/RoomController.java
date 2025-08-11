package com.moya.interfaces.api.room;

import com.moya.domain.roommember.RoomMember;
import com.moya.domain.roommember.RoomMemberId;
import com.moya.interfaces.api.room.request.RegisterRoomDocsRequest;
import com.moya.service.room.RoomDocsService;
import com.moya.service.room.RoomMemberService;
import com.moya.service.room.command.RoomDetailCommand;
import com.moya.service.room.command.RoomDocsInfoCommand;
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
    private final RoomDocsService roomDocsService;
    private final RoomMemberService roomMemberService;

    // 면접 스터디 전체 방 조회
    @GetMapping()
    public List<RoomInfoCommand> getAllRooms() {
        return roomService.getAllRooms();
    }

    // 면접 스터디 방 삭제
    @DeleteMapping("/{roomId}")
    public void deleteRoom(@PathVariable UUID roomId) {
        roomService.deleteRoom(roomId);
    }

    // 면접 스터디 방 상세 조회
    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDetailCommand> getRoom(@PathVariable UUID roomId) {
        RoomDetailCommand rdc = roomService.getRoomDetail(roomId);
        return ResponseEntity.ok(rdc);
    }

    // 면접 스터디 팀 가입
    @PostMapping("/{roomId}")
    public ResponseEntity<RoomMemberId> joinRoom(@PathVariable UUID roomId, @AuthenticationPrincipal CustomUserDetails user){
        RoomMember rm = roomMemberService.joinRoom(roomId, user.getUserId());
        System.out.println("가입완료" + rm.getRoomMemberId());
        return ResponseEntity.ok(rm.getRoomMemberId());
    }
    // 면접 스터디 방 생성
    @PostMapping()
    public UUID createRoom(@RequestBody CreateRoomRequest createRoomRequest, @AuthenticationPrincipal CustomUserDetails user) {
        // 방 만들고
        UUID roomId = roomService.createRoom(createRoomRequest, user.getUserId());
        return roomId;
    }

    // 내 면접 스터디 방 조회
    @GetMapping("/me")
    public List<RoomInfoCommand> getMyRoom(@AuthenticationPrincipal CustomUserDetails user) {
        return roomService.getMyRooms(user.getUserId());
    }

    // 면접 스터디 방 서류 조회
    @GetMapping("/{roomId}/docs")
    public ResponseEntity<List<RoomDocsInfoCommand>> getRoomDocs(@PathVariable UUID roomId) {
        return ResponseEntity.ok(roomDocsService.getRoomDocs(roomId));
    }

    // 면접 스터디 방 서류 등록
    @PostMapping("/{roomId}/register")
    public ResponseEntity<String> registerDocs(@PathVariable UUID roomId, @RequestBody RegisterRoomDocsRequest registerRoomDocsRequest) {

        roomDocsService.createRoomDocs(registerRoomDocsRequest, roomId);
        return ResponseEntity.ok("면접스터디 서류가 등록되었습니다.");
    }
}
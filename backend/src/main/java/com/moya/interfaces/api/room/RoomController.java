package com.moya.interfaces.api.room;

import com.moya.domain.room.Room;
import com.moya.service.room.RoomInfo;
import com.moya.service.room.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/room")
@RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;

    @GetMapping()
    public List<RoomInfo> getAllRooms() {
        return roomService.getAllRooms().stream()
                .map(RoomInfo::from)
                .toList();
    }
}

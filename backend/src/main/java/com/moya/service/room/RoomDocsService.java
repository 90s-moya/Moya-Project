package com.moya.service.room;

import com.moya.domain.roomdocs.RoomDocsRepository;
import com.moya.service.room.command.RoomDocsInfoCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomDocsService {
    private final RoomDocsRepository roomDocsRepository;
    // 면접스터디 방 서류 조회
    @Transactional
    public List<RoomDocsInfoCommand> getRoomDocs(UUID roomId){
        return roomDocsRepository.findDocsByRoomId(roomId);
    }
}

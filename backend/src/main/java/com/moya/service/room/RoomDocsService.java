package com.moya.service.room;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsRepository;
import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.roomdocs.RoomDocs;
import com.moya.domain.roomdocs.RoomDocsId;
import com.moya.domain.roomdocs.RoomDocsRepository;
import com.moya.interfaces.api.room.request.RegisterRoomDocsRequest;
import com.moya.service.room.command.RoomDocsInfoCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomDocsService {
    private final RoomDocsRepository roomDocsRepository;
    private final RoomRepository roomRepository;
    private final DocsRepository docsRepository;
    // 면접스터디 방 서류 조회
    @Transactional
    public List<RoomDocsInfoCommand> getRoomDocs(UUID roomId){
        return roomDocsRepository.findDocsByRoomId(roomId);
    }

    // 면접스터디 방 서류 등록
    @Transactional
    public String createRoomDocs(RegisterRoomDocsRequest registerRoomDocsRequest, UUID roomId) {
        // 존재하는 방인지 확인
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new IllegalArgumentException("해당 방이 없습니다."));
        saveRoomDocs(roomId, registerRoomDocsRequest.getCoverletterId());
        saveRoomDocs(roomId, registerRoomDocsRequest.getResumeId());
        saveRoomDocs(roomId, registerRoomDocsRequest.getPortfolioId());
        return "success";
    }

    private void saveRoomDocs(UUID roomId, UUID docsId) {
        if (docsId == null) return;
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("방이 존재하지 않습니다."));
        Docs docs = docsRepository.selectById(docsId);
        RoomDocsId roomDocsId = new RoomDocsId(roomId, docsId);
        //if (roomDocsRepository.existsById(roomDocsId)) return;
        RoomDocs roomDocs = RoomDocs.builder()
                .roomDocsId(roomDocsId)
                .roomId(room)
                .docsId(docs)
                .build();
        roomDocsRepository.save(roomDocs);
    }
}

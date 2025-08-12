package com.moya.domain.roomdocs;

import com.moya.service.room.command.RoomDocsInfoCommand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface RoomDocsRepository extends JpaRepository<RoomDocs, UUID> {
    // 면접방 서류 조회
    @Query("""
        select new com.moya.service.room.command.RoomDocsInfoCommand (
            d.id, d.userId, d.fileUrl, d.docsStatus
          )
         from RoomDocs rd join Docs d on rd.docsId.id = d.id
         where rd.roomId.id = :roomId
     
     """)
    List<RoomDocsInfoCommand> findDocsByRoomId(UUID roomId);
}

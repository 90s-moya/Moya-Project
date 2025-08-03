package com.moya.domain.roomdocs;

import com.moya.domain.BaseEntity;
import com.moya.domain.docs.Docs;
import com.moya.domain.room.Room;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Builder
@Getter
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomDocs extends BaseEntity {
    @EmbeddedId
    private RoomDocsId roomDocsId;
    @MapsId("room_id")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="room_id", referencedColumnName = "room_id")
    private Room roomId;
    @MapsId("docs_id")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="docs_id", referencedColumnName = "docs_id")
    private Docs docsId;
}

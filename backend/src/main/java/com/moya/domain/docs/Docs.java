package com.moya.domain.docs;

import com.moya.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.UUID;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Docs extends BaseEntity {
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name="docs_id" ,columnDefinition = "BINARY(16)", updatable = false, nullable = false)
    private UUID id;
    private UUID userId;
    @Enumerated
    private DocsStatus docsStatus;
    @Column(name="file_url")
    private String fileUrl;

    @Builder
    private Docs(UUID id, UUID userId,DocsStatus docsStatus,String fileUrl){
        this.id=id;
        this.userId=userId;
        this.docsStatus=docsStatus;
        this.fileUrl=fileUrl;
    }

    public static Docs create(UUID userId,String fileUrl,DocsStatus docsStatus){
        return Docs.builder()
                .userId(userId)
                .fileUrl(fileUrl)
                .docsStatus(docsStatus)
                .build();
    }
}

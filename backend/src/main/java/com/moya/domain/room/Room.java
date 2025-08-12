package com.moya.domain.room;

import com.moya.domain.BaseEntity;
import com.moya.domain.category.Category;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Getter
@Builder
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Room extends BaseEntity {
    @Id
    @GeneratedValue
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "room_id", columnDefinition = "BINARY(16)")
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id")
    private Category categoryId;
    private String conversation;
    @Column(name="max_user")
    private int maxUser;
    private String title;
    private String body;
    @Column(name="expired_at")
    private LocalDateTime expiredAt;
    @Column(name="open_at")
    private LocalDateTime openAt;

}

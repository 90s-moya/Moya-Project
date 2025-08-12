package com.moya.domain.interview;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "evaluation_session")
public class EvaluationSession {

    @Id
    @Column(name = "id", length = 36) // CHAR(36) / VARCHAR(36)
    private String id; // UUID 문자열을 그대로 저장

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Lob
    @Column(name = "summary")
    private String summary;

    @Lob
    @Column(name = "original_text")
    private String originalText;

    @OneToMany(
            mappedBy = "session",
            cascade = CascadeType.ALL,   // JPA 내부 연쇄만 해당 (DB 제약과는 별개)
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("order ASC, subOrder ASC")
    private List<QuestionAnswerPair> qaPairs = new ArrayList<>();
}

package com.moya.domain.interview;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "evaluation_session")
public class EvaluationSession {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id; // UUID 문자열

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "title", length = 100)
    private String title;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Lob
    @Column(name = "original_text")
    private String originalText;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("order ASC, subOrder ASC")
    private List<QuestionAnswerPair> qaPairs = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.title == null) {
            this.title = "AI 모의면접 결과";
        }
    }
}

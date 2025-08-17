package com.moya.domain.interview;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "question_answer_pair")
public class QuestionAnswerPair {

    @Id
    @GeneratedValue(generator = "uuid2")
    @org.hibernate.annotations.GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "id", columnDefinition = "BINARY(16)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", referencedColumnName = "id", nullable = false)
    private EvaluationSession session;

    @Column(name = "`order`", nullable = false)
    private Integer order;

    @Column(name = "sub_order", nullable = false)
    private Integer subOrder;

    @Lob
    @Column(name = "question", nullable = false)
    private String question;

    @Lob
    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "gaze_result", columnDefinition = "json")
    private String gazeResult;

    @Column(name = "posture_result", columnDefinition = "json")
    private String postureResult;

    @Column(name = "face_result", columnDefinition = "json")
    private String faceResult;

    @Lob
    @Column(name = "answer")
    private String answer;

    @Lob
    @Column(name = "stopwords")
    private String stopwords;

    @Column(name = "is_ended")
    private Boolean isEnded;

    @Lob
    @Column(name = "reason_end")
    private String reasonEnd;

    @Column(name = "context_matched")
    private Boolean contextMatched;

    @Lob
    @Column(name = "reason_context")
    private String reasonContext;

    @Lob
    @Column(name = "gpt_comment")
    private String gptComment;

    @Lob
    @Column(name = "end_type")
    private String endType;

    @Lob
    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Lob
    @Column(name = "speech_label")
    private String speechLabel;

    @Lob
    @Column(name = "syll_art")
    private String syllArt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

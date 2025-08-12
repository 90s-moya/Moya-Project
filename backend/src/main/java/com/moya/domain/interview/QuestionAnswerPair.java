package com.moya.domain.interview;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "question_answer_pair")
public class QuestionAnswerPair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id") // INT AUTO_INCREMENT
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", referencedColumnName = "id", nullable = false)
    private EvaluationSession session;

    @Column(name = "`order`", nullable = false) // order는 예약어 가능성 → 백틱으로 회피
    private Integer order;

    @Column(name = "sub_order", nullable = false)
    private Integer subOrder;

    @Lob
    @Column(name = "question", nullable = false)
    private String question;

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

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

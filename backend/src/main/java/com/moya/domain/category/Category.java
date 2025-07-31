package com.moya.domain.category;

import com.moya.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.util.UUID;
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Category extends BaseEntity {
    @Id
    @GeneratedValue
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "category_id", columnDefinition = "BINARY(16)")
    private UUID id;
    private String name;
}

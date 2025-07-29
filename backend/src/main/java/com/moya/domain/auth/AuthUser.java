package com.moya.domain.auth;

import com.moya.domain.user.TutorialStatus;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class AuthUser {
    private UUID userId;
    @Enumerated
    private TutorialStatus tutorialStatus;
}

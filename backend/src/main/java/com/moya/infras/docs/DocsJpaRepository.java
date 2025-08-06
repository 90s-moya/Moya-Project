package com.moya.infras.docs;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

    public interface DocsJpaRepository extends JpaRepository<Docs, UUID> {
        List<Docs> findAllByUserId(UUID userId);

        Docs save(Docs docs);

        void deleteById(UUID id);

        Optional<Docs> findByIdAndUserId(UUID id, UUID userId);

        long countByUserIdAndDocsStatus(UUID userId, DocsStatus docsStatus);
    }

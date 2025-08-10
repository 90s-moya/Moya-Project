    package com.moya.domain.docs;

    import java.util.List;
    import java.util.Optional;
    import java.util.UUID;

    public interface DocsRepository{
        Docs save(Docs docs);
        List<Docs> finAllByUserId(UUID userId);
        Optional<Docs> findByIdAndUserId(UUID id,UUID userId);
        Docs selectById(UUID id);
        void delete(Docs docs);
        long countByUserIdAndDocsStatus(UUID userId, DocsStatus docsStatus);
    }

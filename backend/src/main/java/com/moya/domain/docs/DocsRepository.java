    package com.moya.domain.docs;

    import java.util.List;
    import java.util.Optional;
    import java.util.UUID;

    public interface DocsRepository {
        Docs save(Docs docs);
        List<Docs> finAllByUserId(UUID userId);
        Optional<Docs> findById(UUID id);
        Docs removeById(UUID id);
    }

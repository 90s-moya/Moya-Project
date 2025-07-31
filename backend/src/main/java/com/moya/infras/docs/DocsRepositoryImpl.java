package com.moya.infras.docs;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
@Repository
@RequiredArgsConstructor
public class DocsRepositoryImpl implements DocsRepository {
    private final DocsJpaRepository docsJpaRepository;
    @Override
    public Docs save(Docs docs) {
        return docsJpaRepository.save(docs);
    }

    @Override
    public List<Docs> finAllByUserId(UUID userId) {
        return docsJpaRepository.findAllByUserId(userId);
    }

    @Override
    public Optional<Docs> findById(UUID id) {
        return docsJpaRepository.findById(id);
    }

    public Docs removeById(UUID id) {
        Docs docs = docsJpaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Docs not found with id: " + id));

        docsJpaRepository.deleteById(id);
        return docs;
    }
}

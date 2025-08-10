package com.moya.infras.docs;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsRepository;
import com.moya.domain.docs.DocsStatus;
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
    public Optional<Docs> findByIdAndUserId(UUID id,UUID userId) {
        return docsJpaRepository.findByIdAndUserId(id,userId);
    }

    @Override
    public Docs selectById(UUID id) {
        return docsJpaRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("해당 문서를 찾을 수 없습니다."));
    }


    @Override
    public void delete(Docs docs) {
        docsJpaRepository.delete(docs);
    }

    @Override
    public long countByUserIdAndDocsStatus(UUID userId, DocsStatus docsStatus) {
       return docsJpaRepository.countByUserIdAndDocsStatus(userId,docsStatus);
    }


}

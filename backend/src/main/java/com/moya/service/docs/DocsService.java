package com.moya.service.docs;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsRepository;
import com.moya.domain.docs.DocsStatus;
import com.moya.support.file.FileStorageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

import static com.moya.support.exception.BusinessError.*;

@Service
@RequiredArgsConstructor
public class DocsService {
    private final DocsRepository docsRepository;
    private final FileStorageService fileStorageService;
    @Transactional
    public DocsInfo saveDocs(DocsSaveCommand command) throws IOException{
        MultipartFile file=command.getFile();
        if (command.getDocsStatus() == DocsStatus.RESUME || command.getDocsStatus() == DocsStatus.PORTFOLIO) {
            long count = docsRepository.countByUserIdAndDocsStatus(command.getUserId(), command.getDocsStatus());
            if (count >= 3) {
                throw MAXIMUM_DOCS_LIMIT_EXCEEDED.exception();
            }
        }
        if (!"application/pdf".equals(file.getContentType())) {
            throw INVALID_FILE_TYPE.exception();
        }

        String savedFilePath = fileStorageService.save(file);
        Docs docs= Docs.create(
                command.getUserId(),
                savedFilePath,
                command.getDocsStatus()
        );

        docsRepository.save(docs);
        return DocsInfo.from(docs);
    }
    public List<DocsInfo> getDocs(GetDocsCommand command){
        return docsRepository.finAllByUserId(command.getUserId())
                .stream()
                .map(DocsInfo::from)
                .toList();
    }
    public void deleteDocs(DocsCommand command){
        Docs docs = docsRepository.findByIdAndUserId(command.getDocsId(), command.getUserId())
                .orElseThrow(() -> FILE_URL_NULL_OR_EMPTY.exception());
        fileStorageService.delete(docs.getFileUrl());
        docsRepository.delete(docs);
    }
}

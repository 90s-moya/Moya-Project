package com.moya.service.docs;

import com.moya.domain.docs.Docs;
import com.moya.domain.docs.DocsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;

@Service
@RequiredArgsConstructor
public class DocsService {
    private final DocsRepository docsRepository;
    private static final int MAX_FILE_SIZE=3 * 1024 * 1024;
    @Transactional
    public DocsInfo saveDocs(DocsSaveCommand command){
        Docs docs= Docs.create(
                command.getUserId(),
                command.getFileUrl(),
                command.getDocsStatus()
        );
        docsRepository.save(docs);
        return DocsInfo.from(docs);
    }

}

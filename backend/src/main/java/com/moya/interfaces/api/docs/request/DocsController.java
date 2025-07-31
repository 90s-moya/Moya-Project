package com.moya.interfaces.api.docs.request;

import com.moya.domain.docs.DocsStatus;
import com.moya.service.docs.DocsInfo;
import com.moya.service.docs.DocsService;
import com.moya.support.file.FileStorageService;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RequiredArgsConstructor
@RestController
@RequestMapping("/v1/docs")
public class DocsController {
    private final DocsService docsService;
    private final FileStorageService fileStorageService;
    @PostMapping("/")
    public ResponseEntity<DocsInfo> save(@AuthenticationPrincipal CustomUserDetails user,
                                         @RequestParam("file") MultipartFile file,
                                         @RequestParam("status") DocsStatus docsStatus) throws IOException {
        if (!"application/pdf".equals(file.getContentType())) {
            return ResponseEntity.badRequest().body(null);
        }

        String savedFilePath = fileStorageService.save(file);

        DocsSaveRequest request = new DocsSaveRequest(savedFilePath, docsStatus);
        DocsInfo docsInfo = docsService.saveDocs(request.toCommand(user.getUserId()));

        return ResponseEntity.status(HttpStatus.CREATED).body(docsInfo);
    }
}

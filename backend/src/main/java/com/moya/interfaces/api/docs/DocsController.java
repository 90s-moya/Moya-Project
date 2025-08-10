package com.moya.interfaces.api.docs;

import com.moya.domain.docs.DocsStatus;
import com.moya.interfaces.api.docs.request.DocsRequest;
import com.moya.interfaces.api.docs.request.DocsSaveRequest;
import com.moya.service.docs.*;
import com.moya.support.file.FileStorageService;
import com.moya.support.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

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
        DocsSaveCommand command = new DocsSaveCommand(user.getUserId(), docsStatus, file, null);

        DocsInfo docsInfo = docsService.saveDocs(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(docsInfo);


    }
    @GetMapping("/me")
    public ResponseEntity<List<DocsInfo>> getDocs(@AuthenticationPrincipal CustomUserDetails user){
        return ResponseEntity.ok(docsService.getDocs(new GetDocsCommand(user.getUserId())));
    }
    @DeleteMapping("/{docsId}")
    public ResponseEntity<Void> deleteDocs(@AuthenticationPrincipal CustomUserDetails user,
                                           @PathVariable UUID docsId){
        docsService.deleteDocs(new DocsCommand(docsId,user.getUserId()));
        return ResponseEntity.ok(null);
    }
}
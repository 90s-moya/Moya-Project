package com.moya.support.file;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final String UPLOAD_DIR = "uploads/";

    public String save(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String newFileName = UUID.randomUUID() + "_" + originalFilename;

        Path path = Paths.get(UPLOAD_DIR + newFileName);
        Files.createDirectories(path.getParent());
        Files.write(path, file.getBytes());

        return path.toString();
    }
}
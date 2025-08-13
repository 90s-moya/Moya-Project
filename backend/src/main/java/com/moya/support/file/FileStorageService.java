package com.moya.support.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${FILE_PATH}")
    private String filePath;

    private static final String SUB_DIR = "upload";

    public String save(MultipartFile file) throws IOException {
        String originalFilename = Objects.requireNonNull(file.getOriginalFilename(), "파일명이 없습니다.");
        String newFileName = UUID.randomUUID() + "_" + originalFilename;


        Path fullPath = Paths.get(filePath, SUB_DIR, newFileName);

        Files.createDirectories(fullPath.getParent());

        Files.write(fullPath, file.getBytes());

        return fullPath.toString();
    }

    public String saveOther(MultipartFile file, String folder) throws IOException {
        String fileName = Objects.requireNonNull(file.getOriginalFilename(), "파일명이 없습니다.");
        Path fullPath = Paths.get(filePath, folder, fileName);
        Files.createDirectories(fullPath.getParent());
        Files.write(fullPath, file.getBytes());

        return fullPath.toString();
    }

    public void delete(String fullFilePath) {
        try {
            Path path = Paths.get(fullFilePath);
            Files.deleteIfExists(path); // 파일이 있으면 삭제
        } catch (IOException e) {
            throw new RuntimeException("파일 삭제 중 오류 발생: " + fullFilePath, e);
        }
    }}
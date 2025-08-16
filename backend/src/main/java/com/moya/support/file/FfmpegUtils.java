package com.moya.support.file;

import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;

public class FfmpegUtils {

    public static MultipartFile convertWebmToMp4IfNeeded(MultipartFile src)
            throws IOException, InterruptedException {

        String originalName = (src.getOriginalFilename() != null) ? src.getOriginalFilename() : "upload.webm";
        String lower = originalName.toLowerCase();

        // webm 아니면 그대로 반환
        if (!lower.endsWith(".webm")) return src;

        // 1) 업로드 파일을 임시 .webm으로 저장
        File tempWebm = Files.createTempFile("upload-", ".webm").toFile();
        try (InputStream in = src.getInputStream(); OutputStream out = new FileOutputStream(tempWebm)) {
            in.transferTo(out);
        }

        // 2) FFmpeg로 mp4 변환
        File tempMp4 = Files.createTempFile("converted-", ".mp4").toFile();
        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg", "-y",
                "-i", tempWebm.getAbsolutePath(),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-movflags", "+faststart",
                tempMp4.getAbsolutePath()
        );
        pb.redirectErrorStream(true);
        Process p = pb.start();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            while (br.readLine() != null) { /* consume logs */ }
        }
        int exit = p.waitFor();
        // 중간 파일은 바로 지움
        tempWebm.delete();

        if (exit != 0) {
            tempMp4.delete();
            throw new RuntimeException("FFmpeg 변환 실패(exit=" + exit + ")");
        }

        // 3) 변환된 mp4를 MultipartFile로 감싸서 반환
        String mp4Name = replaceExtToMp4(originalName);
        return new SimpleMultipartFile(tempMp4, "file", mp4Name, "video/mp4");
    }

    private static String replaceExtToMp4(String name) {
        int dot = name.lastIndexOf('.');
        return (dot > -1) ? name.substring(0, dot) + ".mp4" : name + ".mp4";
    }
}

package com.moya.support.file;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

public class PdfTextExtractor {

    public static String extractTextFromUrl(String pdfUrl) throws IOException{
        try {
            // 1. PDF 파일 로드
            InputStream inputStream = new URL(pdfUrl).openStream();

            //2. PDF 로드
            PDDocument document = PDDocument.load(inputStream);

            // 3. PDFTextStripper 객체 생성
            PDFTextStripper pdfTextStripper = new PDFTextStripper();

            // 4. 텍스트 추출
            String text = pdfTextStripper.getText(document);
            System.out.println(text);

            document.close();
            inputStream.close();
            return text;

        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
}
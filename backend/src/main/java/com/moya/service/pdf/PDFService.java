package com.moya.service.pdf;

import com.moya.domain.room.Room;
import com.moya.service.room.command.RoomInfoCommand;
import com.moya.support.file.PdfTextExtractor;
import org.springframework.stereotype.Service;

@Service
public class PDFService {
    // PDF 내 Text 추출
    public String getText(String fileURL) {
        try{
            return PdfTextExtractor.extractTextFromUrl(fileURL);
        } catch(Exception e){
            throw new RuntimeException("PDF 텍스트 추출 실패: "+e.getMessage());
        }
    }
}

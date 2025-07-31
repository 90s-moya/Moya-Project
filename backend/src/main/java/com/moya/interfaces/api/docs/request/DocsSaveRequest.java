package com.moya.interfaces.api.docs.request;

import com.moya.domain.docs.DocsStatus;
import com.moya.service.docs.DocsSaveCommand;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

import static com.moya.support.exception.BusinessError.*;

@Getter
@AllArgsConstructor
public class DocsSaveRequest {
    private String fileUrl;
    private DocsStatus docsStatus;


    public DocsSaveCommand toCommand(UUID userId, MultipartFile file){
        if (fileUrl==null){
            throw FILE_URL_NULL_OR_EMPTY.exception();
        }
        return new DocsSaveCommand(userId,docsStatus,file,fileUrl);
    }
}

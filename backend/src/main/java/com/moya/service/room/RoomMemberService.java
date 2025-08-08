package com.moya.service.room;

import com.moya.domain.roommember.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;


@Service
@RequiredArgsConstructor
public class RoomMemberService {

    private final RoomMemberRepository roomMemberRepository;

    //면접스터디 비디오 업로드
    @Transactional(readOnly = true)
    public String createVideo(MultipartFile file) {
        System.out.println(file);
        return null;
    }

}

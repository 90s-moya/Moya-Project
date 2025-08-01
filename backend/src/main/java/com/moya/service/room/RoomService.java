package com.moya.service.room;

import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.roommember.RoomMember;
import com.moya.domain.roommember.RoomMemberRepository;
import com.moya.domain.user.User;
import com.moya.service.room.command.MasterInfo;
import com.moya.service.room.command.RoomDetailCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;

    // 면접 스터디 전체 조회
    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }
    // 면접 스터디 방 삭제
    @Transactional
    public void deleteRoom(UUID room_id) {
        roomRepository.deleteById(room_id);
    }
    // 면접 스터디 방 상세 조회
    @Transactional
    public RoomDetailCommand getRoomDetail(UUID room_id){
        // room select
        Room room = roomRepository.findById(room_id).orElseThrow(() -> new RuntimeException("존재하지 않는 방입니다."));
        // room member select
        List<RoomMember> members = roomMemberRepository.findByRoomId(room_id);
        // 참여자 리스트
        List<String> joinUsers  = members.stream().map(rm -> rm.getUser_id().getNickname()).toList();
        // 방장 정보
        RoomMember master = members.stream().filter(RoomMember::is_master).findFirst().orElseThrow(() -> new RuntimeException("방장이 존재하지 않습니다."));

        User masterUser = master.getUser_id();
        int makeRoomCnt = roomMemberRepository.countMasterRoomsByUserId(masterUser.getId());

        MasterInfo masterInfo = MasterInfo.builder()
                .nickname(masterUser.getNickname())
                .makeRoomCnt(makeRoomCnt)
                .createdAt(masterUser.getCreatedAt())
                .build();

        return RoomDetailCommand.builder()
                .title(room.getTitle())
                .body(room.getBody())
                .maxUser(room.getMax_user())
                .openAt(room.getOpen_at())
                .expiredAt(room.getExpired_at())
                .categoryName(room.getCategory_id().getName())
                .joinUsers(joinUsers)
                .masterInfo(masterInfo)
                .build();
    }
}

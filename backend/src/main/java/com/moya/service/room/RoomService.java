package com.moya.service.room;

import com.moya.domain.category.Category;
import com.moya.domain.category.CategoryRepository;
import com.moya.domain.room.Room;
import com.moya.domain.room.RoomRepository;
import com.moya.domain.roommember.RoomMember;
import com.moya.domain.roommember.RoomMemberId;
import com.moya.domain.roommember.RoomMemberRepository;
import com.moya.domain.user.User;
import com.moya.domain.user.UserRepository;
import com.moya.interfaces.api.room.request.CreateRoomRequest;
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
    private final CategoryRepository  categoryRepository;
    private final UserRepository userRepository;

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

    // 방 생성
    @Transactional
    public UUID createRoom(CreateRoomRequest createRoomRequest, UUID userId){
        // 방 만들기
        Category category = categoryRepository.findById(createRoomRequest.getCategory_id()).orElseThrow(() -> new RuntimeException("해당 카테고리가 없습니다."));

        Room room = Room.builder()
                .category_id(category)
                .conversation(null)
                .max_user(createRoomRequest.getMax_user())
                .title(createRoomRequest.getTitle())
                .body(createRoomRequest.getBody())
                .expired_at(createRoomRequest.getExpire_at())
                .open_at(createRoomRequest.getOpen_at())
                .build();
        Room makedRoom = roomRepository.save(room);
        User user = userRepository.findById(userId).orElseThrow(()->new RuntimeException("해당 유저가 없습니다."));

        // 구성원에 방장으로 유저 넣어주기
        RoomMember member = RoomMember.builder()
                .roomMemberId(new RoomMemberId(makedRoom.getId(), userId))
                .room_id(makedRoom)
                .user_id(user)
                .is_master(true)
                .build();
        roomMemberRepository.save(member);

        return makedRoom.getId();
    }
}

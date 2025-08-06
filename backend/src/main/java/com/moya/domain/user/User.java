package com.moya.domain.user;

import static jakarta.persistence.GenerationType.*;
import static lombok.AccessLevel.*;

import com.moya.domain.BaseEntity;

import com.moya.domain.otp.Otp;
import com.moya.domain.user.UserStatus;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;
import java.util.UUID;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = PROTECTED)
public class User extends BaseEntity {

	@Id
	@GeneratedValue(generator = "uuid2")
	@GenericGenerator(name = "uuid2", strategy = "uuid2")
	@Column(name = "user_id", columnDefinition = "BINARY(16)", updatable = false, nullable = false)
	private UUID id;
	private String email;
	private String nickname;
	private String password;

	@Enumerated(EnumType.STRING)
	private UserStatus userStatus;
	@Enumerated(EnumType.STRING)
	private TutorialStatus tutorialStatus;
	@Enumerated(EnumType.STRING)
	private UserRole userRole;

	@Builder
	private User(String email,String nickname,String password,UserRole userRole){
		this.email=email;
		this.nickname=nickname;
		this.password=password;
		this.userStatus=UserStatus.ACTIVE;
		this.tutorialStatus=TutorialStatus.INCOMPLETE;
		this.userRole=UserRole.USER;

	}

	public User(UUID id, String email, String nickname, String password, UserStatus userStatus, TutorialStatus tutorialStatus,UserRole userRole){
		this.id =id;
		this.email=email;
		this.password=password;
		this.nickname=nickname;
		this.userStatus=userStatus !=null? userStatus:UserStatus.ACTIVE;
		this.tutorialStatus=tutorialStatus !=null? tutorialStatus:TutorialStatus.INCOMPLETE;
		this.userRole=userRole !=null? userRole:UserRole.USER;

	}

	public static User create(String email, String nickname, String password) {
		return User.builder()
				.email(email)
				.nickname(nickname)
				.password(password)
				.build();
	}

	public void signUp(Otp otp) {
		otp.validateVerified();
	}

	public void withDraw(){
		this.userStatus = UserStatus.WITHDRAW;
	}

	public String findEmail(Otp otp) {
		otp.validateVerified();
		return this.email;
	}

	public void changePassword(Otp otp, String password) {
		otp.validateVerified();
		this.password = password;
	}

	public void changePassword(String password) {
		this.password = password;
	}
	public void changeNickname(String nickname){
		this.nickname = nickname;
	}
}



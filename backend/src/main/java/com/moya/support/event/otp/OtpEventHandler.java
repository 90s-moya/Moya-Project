package com.moya.support.event.otp;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OtpEventHandler {

	private final JavaMailSender javaMailSender;

	@Async
	@EventListener
	public void sendMail(OtpMailEvent event) {
		javaMailSender.send(event.getMessage());
	}
}

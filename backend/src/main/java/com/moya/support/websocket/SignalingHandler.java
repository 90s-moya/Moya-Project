package com.moya.support.websocket;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> clients = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("연결됨: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        JSONObject data = new JSONObject(payload);
        String type = data.getString("type");
        String senderId = data.getString("senderId");
        String nickname = data.getString("nickname");

        if (type.equals("join")) {
            if(clients.containsKey(senderId)){
                WebSocketSession s = clients.get(senderId);
                if(s != null && s.isOpen() && !s.getId().equals(session.getId())){
                    s.close();
                    System.out.println("중복 세션 종료 "+s.getId());
                }
            }
            clients.put(senderId, session);
            System.out.println("참가 "+senderId);
            System.out.println("현재 접속자: "+clients.keySet());

            // 기존 참가자 목록 전송
            JSONArray existingIds = new JSONArray();
            for (String id : clients.keySet()) {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                if (!id.equals(senderId)) {
                    existingIds.put(obj);
                }
            }
            JSONObject existingMsg = new JSONObject();
            existingMsg.put("type", "existingParticipants");
            existingMsg.put("senderId", "server");
            existingMsg.put("participants", existingIds);
            existingMsg.put("nickname", nickname);

            session.sendMessage(new TextMessage(existingMsg.toString()));

            // 다른 참가자에게 이 참가자 입장 알리기
            JSONObject joinMsg = new JSONObject();
            joinMsg.put("type", "join");
            joinMsg.put("senderId", senderId);
            joinMsg.put("nickname", nickname);

            for (Map.Entry<String, WebSocketSession> entry : clients.entrySet()) {
                if (!entry.getKey().equals(senderId) && entry.getValue().isOpen()) {
                    entry.getValue().sendMessage(new TextMessage(joinMsg.toString()));
                }
            }

        } else if(type.equals("leave")) {
            WebSocketSession s = clients.remove(senderId);
            System.out.println("퇴장 :" + senderId);

            JSONObject leaveMsg = new JSONObject();
            leaveMsg.put("type", "leave");
            leaveMsg.put("senderId", senderId);

            for (WebSocketSession targetSession : clients.values()) {
                if (targetSession.isOpen()) {
                    targetSession.sendMessage(new TextMessage(leaveMsg.toString()));
                }
            }
        }
        else {
            // offer / answer / ice 전송
            if (data.has("targetId")) {
                String targetId = data.getString("targetId");
                WebSocketSession targetSession = clients.get(targetId);
                if (targetSession != null && targetSession.isOpen()) {
                    targetSession.sendMessage(new TextMessage(payload));
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        clients.values().remove(session); // 연결 끊긴 세션 제거
    }
}

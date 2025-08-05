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

        if (type.equals("join")) {
            clients.put(senderId, session);

            // 기존 참가자 목록 전송
            JSONArray existingIds = new JSONArray();
            for (String id : clients.keySet()) {
                if (!id.equals(senderId)) {
                    existingIds.put(id);
                }
            }
            JSONObject existingMsg = new JSONObject();
            existingMsg.put("type", "existingParticipants");
            existingMsg.put("senderId", "server");
            existingMsg.put("participants", existingIds);
            session.sendMessage(new TextMessage(existingMsg.toString()));

            // 다른 참가자에게 이 참가자 입장 알리기
            JSONObject joinMsg = new JSONObject();
            joinMsg.put("type", "join");
            joinMsg.put("senderId", senderId);

            for (Map.Entry<String, WebSocketSession> entry : clients.entrySet()) {
                if (!entry.getKey().equals(senderId) && entry.getValue().isOpen()) {
                    entry.getValue().sendMessage(new TextMessage(joinMsg.toString()));
                }
            }

        } else {
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

FROM gradle:8.5.0-jdk17 AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle build --no-daemon || true
COPY . .
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:17-jdk
WORKDIR /app

# ffmpeg 설치 추가
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
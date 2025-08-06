import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Camera } from "lucide-react";
import Header from "@/components/common/Header";
import { useNavigate, useParams } from "react-router-dom";
import FileUploadSection from "@/components/study/FileUploadSection";
import axios from "axios";
import { getTokenFromLocalStorage } from "@/util/getToken";
import { getMyDocs } from "@/api/studyApi";
import type { docsForEnterRoom } from "@/types/study";
import { ref } from "process";

export default function StudySetupPage() {
  // 카메라 및 마이크 상태 확인용 변수
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();

  const { id } = useParams(); // 라우트의 id

  const [myDocs, setMyDocs] = useState<docsForEnterRoom | null>(null);

  // 카메라 및 오디오 시작 함수
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // 마이크 연결 체크
      const audioTracks = stream.getAudioTracks();
      if (stream && audioTracks.length > 0) {
        alert("마이크 연결됨");
        setIsMicOn(true);
      } else {
        console.log("마이크 연결 오류");
        alert("마이크 연결 오류");
      }

      // 카메라 연결 체크
      const cameraTracks = stream.getVideoTracks();
      if (stream && cameraTracks.length > 0) {
        alert("카메라 연결됨");
        setIsCameraOn(true);
      } else {
        console.log("카메라 연결 오류");
        alert("카메라 연결 오류");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.log("startStream 오류");
      alert("startStream 오류");
    }
  };

  // 등록한 내 서류 불러오기
  useEffect(() => {
    const requestMyDocs = async () => {
      try {
        const data = await getMyDocs();
        console.log("내 서류 조회 결과 : ", data);

        const mappedDocs: docsForEnterRoom = {
          resume_id: "",
          portfolio_id: "",
          coverletter_id: "",
        };

        data.forEach((doc: any) => {
          const { docsId, docsStatus } = doc;
          switch (docsStatus) {
            case "RESUME":
              mappedDocs.resume_id = docsId;
              break;
            case "PORTFOLIO":
              mappedDocs.portfolio_id = docsId;
              break;
            case "COVER_LETTER":
              mappedDocs.coverletter_id = docsId;
              break;
          }
        });

        setMyDocs(mappedDocs);
      } catch (err) {
        console.error("내 서류 조회 실패", err);
      }
    };

    requestMyDocs();
  }, []);

  // 환경 설정 완료 후 방 입장 시 실행되는 함수
  const handleEnterRoom = async () => {
    // 로컬 스토리지로부터 토큰 받아오기
    const token = getTokenFromLocalStorage();

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/v1/room/${id}/enter`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("API를 통해 받은 룸 상세 정보 : ", res.data);
    } catch (err) {
      console.error("❌ 에러 발생", err);
    }

    // 입장 성공 시 룸으로 이동
    navigate(`/study/room/${id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 pt-[120px] pb-20 text-[17px] leading-relaxed">
        {/* 타이틀 */}
        <h1 className="text-3xl font-bold text-center mb-12">면접스터디를 위해 환경을 설정해 주세요</h1>

        {/* 콘텐츠 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-16">
          {/* 카메라 박스 */}
          <div className="w-full rounded-2xl border-4 border-blue-500 bg-gray-100 shadow-md overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isCameraOn ? "block" : "hidden"}`} />
            {!isCameraOn && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-xl text-gray-600">카메라를 활성화해주세요</div>
              </div>
            )}
          </div>

          {/* 우측: 파일 업로드 */}
          <div className="space-y-6">
            <FileUploadSection label="이력서" type="resume" />
            <FileUploadSection label="포트폴리오" type="portfolio" />
            <FileUploadSection label="자기소개서" type="introduction" />
          </div>
        </div>

        {/* 카메라 및 마이크 상태 + 버튼 */}
        <div className="flex flex-col items-center space-y-6">
          {/* 마이크/카메라 상태 */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {/* 카메라 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
              <div className="flex items-center gap-2">
                <Camera className={`w-6 h-6 ${isCameraOn ? "text-green-500" : "text-gray-400"}`} />
                <span className="text-lg font-medium">카메라</span>
              </div>
              <span className={`text-base font-semibold ${isCameraOn ? "text-green-600" : "text-gray-500"}`}>{isCameraOn ? "연결됨" : "연결 대기중"}</span>
            </div>

            {/* 마이크 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
              <div className="flex items-center gap-2">
                <Mic className={`w-6 h-6 ${isMicOn ? "text-green-500" : "text-gray-400"}`} />
                <span className="text-lg font-medium">마이크</span>
              </div>
              <span className={`text-base font-semibold ${isMicOn ? "text-green-600" : "text-gray-500"}`}>{isMicOn ? "연결됨" : "연결 대기중"}</span>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center gap-6 mt-6">
            <Button onClick={startStream} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-6 text-lg">
              카메라 및 마이크 시작
            </Button>
            <Button
              onClick={handleEnterRoom}
              disabled={!isCameraOn || !isMicOn}
              className={`px-8 py-6 text-lg ${isCameraOn && isMicOn ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
            >
              참여하기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

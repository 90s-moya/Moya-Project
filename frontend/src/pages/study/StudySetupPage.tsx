import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Camera,
  FileText,
  Video,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Header from "@/components/common/Header";
import { useNavigate, useParams } from "react-router-dom";
import { registerDocs, getMyDocsForEnterRoom } from "@/api/studyApi";
import type { MyDoc } from "@/types/study";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// 파일명만 추출하는 유틸리티 함수
const getFileName = (fileUrl: string): string => {
  try {
    // URL에서 파일명 추출
    const url = new URL(fileUrl);
    const pathname = url.pathname;
    const fileName = pathname.split("/").pop() || fileUrl;

    // UUID 패턴 제거 (DocsUpload.tsx와 동일한 방식)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;
    const cleanFileName = fileName.replace(uuidPattern, "");

    return decodeURIComponent(cleanFileName);
  } catch {
    // URL이 아닌 경우 파일 경로에서 파일명 추출
    const fileName = fileUrl.split("/").pop() || fileUrl;

    // UUID 패턴 제거
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;
    const cleanFileName = fileName.replace(uuidPattern, "");

    return decodeURIComponent(cleanFileName);
  }
};

export default function StudySetupPage() {
  // 카메라 및 마이크 상태 확인용 변수
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();

  const { id } = useParams();

  // API를 통해 불러온 내 서류 정보를 저장하는 docList
  const [docList, setDocList] = useState<MyDoc[]>([]);

  const resumeDocs = docList.filter((doc) => doc.docsStatus === "RESUME");
  const portfolioDocs = docList.filter((doc) => doc.docsStatus === "PORTFOLIO");
  const coverLetterDocs = docList.filter(
    (doc) => doc.docsStatus === "COVERLETTER"
  );
  // Select 태그로 선택된 문서들
  const [selectedDocs, setSelectedDocs] = useState({
    resumeId: "",
    portfolioId: "",
    coverletterId: "",
  });

  // 등록된 내 서류 불러오기
  useEffect(() => {
    const requestMyDocs = async () => {
      try {
        const data = await getMyDocsForEnterRoom();
        console.log("내 서류 조회 결과 : ", data);

        setDocList(data);
      } catch (err) {
        console.error("내 서류 조회 실패", err);
      }
    };

    requestMyDocs();
  }, []);

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
        console.log("마이크 연결됨");
        setIsMicOn(true);
      } else {
        console.log("마이크 연결 오류");
        alert("마이크 연결 오류");
      }

      // 카메라 연결 체크
      const cameraTracks = stream.getVideoTracks();
      if (stream && cameraTracks.length > 0) {
        console.log("카메라 연결됨");
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

  // 문서 선택 시 selectedDocs를 변경하는 핸들러
  const handleChangeDocs = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    setSelectedDocs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 환경 설정 완료 후 방 입장 시 실행되는 함수
  const handleEnterRoom = async () => {
    const { resumeId, portfolioId, coverletterId } = selectedDocs;

    if (!resumeId || !portfolioId || !coverletterId) {
      alert("모든 문서를 선택해야 방에 입장할 수 있습니다.");
      return;
    }

    try {
      const data = await registerDocs({
        roomId: id!,
        resumeId,
        portfolioId,
        coverletterId,
      });

      console.log("방으로 입장 성공!!", data);
      navigate(`/study/room/${id}`);
    } catch (err) {
      console.error("❌ 에러 발생", err);
      alert("방 입장에 실패하였습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-12 text-[17px] leading-relaxed">
        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#1b1c1f] mb-2">
            면접스터디 환경 설정
          </h1>
          <p className="text-[#4b4e57] text-lg">
            카메라, 마이크, 그리고 필요한 서류를 준비해주세요!
          </p>
        </div>

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* 좌측: 메인 설정 영역 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 카메라 및 마이크 설정 카드 */}
            <Card className="p-8 w-full max-w-2xl">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Video className="w-6 h-6 text-[#2b7fff]" />
                  <Label className="text-xl font-bold text-[#1b1c1f]">
                    카메라 및 마이크 설정
                  </Label>
                </div>

                {/* 카메라 박스 */}
                <div
                  className="w-full rounded-2xl border-2 border-[#dedee4] bg-gray-50 shadow-sm overflow-hidden transition-all duration-200 hover:border-[#2b7fff]/50"
                  style={{ aspectRatio: "4 / 3" }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover transform scale-x-[-1] ${
                      isCameraOn ? "block" : "hidden"
                    }`}
                  />
                  {!isCameraOn && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-12 h-12 text-[#6f727c] mx-auto mb-3" />
                        <div className="text-lg text-[#6f727c] font-medium">
                          카메라를 활성화해주세요
                        </div>
                        <div className="text-sm text-[#6f727c] mt-1">
                          면접 진행을 위해 필요합니다
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 카메라 및 마이크 상태 표시 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 카메라 상태 */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <Camera
                        className={`w-5 h-5 ${
                          isCameraOn ? "text-green-500" : "text-[#6f727c]"
                        }`}
                      />
                      <span className="text-base font-medium text-[#1b1c1f]">
                        카메라
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCameraOn ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-[#6f727c]" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          isCameraOn ? "text-green-600" : "text-[#6f727c]"
                        }`}
                      >
                        {isCameraOn ? "연결됨" : "연결 대기중"}
                      </span>
                    </div>
                  </div>

                  {/* 마이크 상태 */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <Mic
                        className={`w-5 h-5 ${
                          isMicOn ? "text-green-500" : "text-[#6f727c]"
                        }`}
                      />
                      <span className="text-base font-medium text-[#1b1c1f]">
                        마이크
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMicOn ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-[#6f727c]" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          isMicOn ? "text-green-600" : "text-[#6f727c]"
                        }`}
                      >
                        {isMicOn ? "연결됨" : "연결 대기중"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 우측: 서류 선택 및 액션 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 서류 선택 카드 */}
            <Card className="p-6 w-full">
              <h3 className="text-xl font-bold text-[#1b1c1f] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2b7fff]" />
                서류 선택
              </h3>
              <div className="space-y-4">
                {/* 이력서 선택 */}
                <div className="space-y-2">
                  <Label
                    htmlFor="resumeId"
                    className="text-sm font-semibold text-[#1b1c1f]"
                  >
                    이력서
                  </Label>
                  <select
                    name="resumeId"
                    id="resumeId"
                    onChange={handleChangeDocs}
                    className="w-full border border-[#dedee4] rounded-lg px-3 py-2 text-sm focus:border-[#2b7fff] focus:outline-none transition-colors"
                  >
                    <option value="" className="text-[#6f727c]">
                      이력서를 선택하세요
                    </option>
                    {resumeDocs?.map((file) => (
                      <option key={file.docsId} value={file.docsId}>
                        {getFileName(file.fileUrl)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 자기소개서 선택 */}
                <div className="space-y-2">
                  <Label
                    htmlFor="coverletterId"
                    className="text-sm font-semibold text-[#1b1c1f]"
                  >
                    자기소개서
                  </Label>
                  <select
                    name="coverletterId"
                    id="coverletterId"
                    onChange={handleChangeDocs}
                    className="w-full border border-[#dedee4] rounded-lg px-3 py-2 text-sm focus:border-[#2b7fff] focus:outline-none transition-colors"
                  >
                    <option value="" className="text-[#6f727c]">
                      자기소개서를 선택하세요
                    </option>
                    {coverLetterDocs?.map((file) => (
                      <option key={file.docsId} value={file.docsId}>
                        {getFileName(file.fileUrl)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 포트폴리오 선택 */}
                <div className="space-y-2">
                  <Label
                    htmlFor="portfolioId"
                    className="text-sm font-semibold text-[#1b1c1f]"
                  >
                    포트폴리오
                  </Label>
                  <select
                    name="portfolioId"
                    id="portfolioId"
                    onChange={handleChangeDocs}
                    className="w-full border border-[#dedee4] rounded-lg px-3 py-2 text-sm focus:border-[#2b7fff] focus:outline-none transition-colors"
                  >
                    <option value="" className="text-[#6f727c]">
                      포트폴리오를 선택하세요
                    </option>
                    {portfolioDocs?.map((file) => (
                      <option key={file.docsId} value={file.docsId}>
                        {getFileName(file.fileUrl)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* 액션 버튼 카드 */}
            <Card className="p-6 w-full">
              <div className="space-y-4">
                <Button
                  onClick={startStream}
                  className="w-full bg-[#2b7fff] hover:bg-blue-600 text-white px-6 py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  카메라 및 마이크 시작
                </Button>
                <Button
                  onClick={handleEnterRoom}
                  disabled={!isCameraOn || !isMicOn}
                  className={`w-full px-6 py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 ${
                    isCameraOn && isMicOn
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  참여하기
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

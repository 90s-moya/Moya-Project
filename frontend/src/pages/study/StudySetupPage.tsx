import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Camera } from "lucide-react";
import Header from "@/components/common/Header";
import { useNavigate, useParams } from "react-router-dom";
import { registerDocs, getMyDocsForEnterRoom } from "@/api/studyApi";
import type { MyDoc } from "@/types/study";

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
    (doc) => doc.docsStatus === "COVER_LETTER"
  );
  // Select 태그로 선택된 문서들
  const [selectedDocs, setSelectedDocs] = useState({
    resume_id: "",
    portfolio_id: "",
    coverletter_id: "임시 coverletter_id입니다.",
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
    const { resume_id, portfolio_id, coverletter_id } = selectedDocs;

    if (!resume_id || !portfolio_id || !coverletter_id) {
      alert("모든 문서를 선택해야 방에 입장할 수 있습니다.");
      return;
    }

    try {
      await registerDocs({
        room_id: id!,
        resume_id,
        portfolio_id,
        coverletter_id,
      });

      console.log("방으로 입장 성공!!");
      navigate(`/study/room/${id}`);
    } catch (err) {
      console.error("❌ 에러 발생", err);
      alert("방 입장에 실패하였습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 pt-[120px] pb-20 text-[17px] leading-relaxed">
        {/* 타이틀 */}
        <h1 className="text-3xl font-bold text-center mb-12">
          면접스터디를 위해 환경을 설정해 주세요
        </h1>

        {/* 콘텐츠 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-16">
          {/* 카메라 박스 */}
          <div
            className="w-full rounded-2xl border-4 border-blue-500 bg-gray-100 shadow-md overflow-hidden"
            style={{ aspectRatio: "4 / 3" }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${
                isCameraOn ? "block" : "hidden"
              }`}
            />
            {!isCameraOn && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-xl text-gray-600">
                  카메라를 활성화해주세요
                </div>
              </div>
            )}
          </div>

          {/* 문서 파일 선택 */}
          <div className="space-y-6">
            <div>
              <label htmlFor="doc-resume_id">이력서</label>
              <select
                name="resume_id"
                id="resume_id"
                onChange={handleChangeDocs}
              >
                <option value="">이력서를 선택하세요</option>
                {resumeDocs?.map((file) => (
                  <option key={file.docsId} value={file.docsId}>
                    {file.fileUrl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="coverletter_id">자기소개서</label>
              <select
                name="coverletter_id"
                id="coverletter_id"
                onChange={handleChangeDocs}
              >
                <option value="">자기소개서를 선택하세요</option>
                {coverLetterDocs?.map((file) => (
                  <option key={file.docsId} value={file.docsId}>
                    {file.fileUrl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="portfolio_id">포트폴리오</label>
              <select
                name="portfolio_id"
                id="portfolio_id"
                onChange={handleChangeDocs}
              >
                <option value="">포트폴리오를 선택하세요</option>
                {portfolioDocs?.map((file) => (
                  <option key={file.docsId} value={file.docsId}>
                    {file.fileUrl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 카메라 및 마이크 상태 + 버튼 */}
        <div className="flex flex-col items-center space-y-6">
          {/* 마이크/카메라 상태 */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {/* 카메라 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
              <div className="flex items-center gap-2">
                <Camera
                  className={`w-6 h-6 ${
                    isCameraOn ? "text-green-500" : "text-gray-400"
                  }`}
                />
                <span className="text-lg font-medium">카메라</span>
              </div>
              <span
                className={`text-base font-semibold ${
                  isCameraOn ? "text-green-600" : "text-gray-500"
                }`}
              >
                {isCameraOn ? "연결됨" : "연결 대기중"}
              </span>
            </div>

            {/* 마이크 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
              <div className="flex items-center gap-2">
                <Mic
                  className={`w-6 h-6 ${
                    isMicOn ? "text-green-500" : "text-gray-400"
                  }`}
                />
                <span className="text-lg font-medium">마이크</span>
              </div>
              <span
                className={`text-base font-semibold ${
                  isMicOn ? "text-green-600" : "text-gray-500"
                }`}
              >
                {isMicOn ? "연결됨" : "연결 대기중"}
              </span>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center gap-6 mt-6">
            <Button
              onClick={startStream}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-6 text-lg"
            >
              카메라 및 마이크 시작
            </Button>
            <Button
              onClick={handleEnterRoom}
              disabled={!isCameraOn || !isMicOn}
              className={`px-8 py-6 text-lg ${
                isCameraOn && isMicOn
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              참여하기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

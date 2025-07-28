import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";

export default function StudyDetailPage() {
  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* Header */}
      <Header></Header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <ArrowLeft className="w-5 h-5 text-[#6f727c]" />
            <h2 className="text-xl font-semibold text-[#1b1c1f]">
              SK 그룹 보안 솔루션 운영자 면스 모집
            </h2>
          </div>
          <Button className="bg-[#2b7fff] hover:bg-[#2b7fff]/90 text-white px-6 py-2 rounded-lg">
            찾아하기
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Information */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#1b1c1f] mb-4">
                방 정보
              </h3>
              <div className="space-y-4">
                <div className="flex">
                  <span className="w-20 text-[#6f727c] text-sm">대분류</span>
                  <span className="text-[#1b1c1f] text-sm">IT</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-[#6f727c] text-sm">참여 인원</span>
                  <span className="text-[#1b1c1f] text-sm">4명</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-[#6f727c] text-sm">
                    참여자 정보
                  </span>
                  <div className="text-[#1b1c1f] text-sm">
                    <div>김수종</div>
                    <div>한정구</div>
                    <div>강민수</div>
                  </div>
                </div>
                <div className="flex">
                  <span className="w-20 text-[#6f727c] text-sm">일시</span>
                  <span className="text-[#1b1c1f] text-sm">
                    2025-07-28 18:00
                  </span>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <h3 className="text-lg font-semibold text-[#1b1c1f] mb-4">
                상세 설명
              </h3>
              <div className="space-y-4 text-sm text-[#404249]">
                <div>
                  <p className="font-medium mb-2">스터디 목적</p>
                  <ul className="space-y-1 ml-4">
                    <li>
                      • SK 그룹 계열사의 보안 솔루션 운영자 직무 면접을 가정한
                      모의 면접 연습
                    </li>
                    <li>
                      • 각자의 경험과 지식을 바탕으로 예상 질문을 주고받고,
                      피드백
                    </li>
                    <li>• 보안 솔루션 실무 이해도 향상 및 면접 대응력 강화</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">🔥 다루는 주요 내용</p>
                  <ul className="space-y-1 ml-4">
                    <li>
                      • EDR, DLP, SIEM 등 보안 솔루션의 개념 및 운영 경험 공유
                    </li>
                    <li>• 보안 이벤트 대응, 로그 분석, 내부 보안 정책 사례</li>
                    <li>• 실제 자소서 기반 자기소개 및 직무 질문 연습</li>
                    <li>
                      • SK 그룹 보안 직무 면접에서 나올 법한 기술/상황별 질문
                      예상
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">⚠️ 참여 대상</p>
                  <ul className="space-y-1 ml-4">
                    <li>• 보안 직무 지원을 준비 중인 취업생</li>
                    <li>• 운영자/관제/보안 분석 분야에 관심 있는 사람</li>
                    <li>
                      • 정보보안 자격증(CISSP, CPPG, 정보보안기사 등) 준비자
                    </li>
                    <li>• 스터디 진행 방식 (예시)</li>
                    <li>• 자기소개 + 간단한 포트폴리오 발표 (5분 이내)</li>
                    <li>• 면접 or 자료 질문 → 답변 후 피드백</li>
                    <li>• 공통 질문 리스트 정리 및 피드백 공유</li>
                    <li>• 직무 관련 트렌드 사항 토론</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-[#1b1c1f] mb-4">
              기업 정보
            </h3>
            <div className="space-y-4">
              <div className="flex">
                <span className="w-24 text-[#6f727c] text-sm">방장명</span>
                <span className="text-[#1b1c1f] text-sm">최창빈</span>
              </div>
              <div className="flex">
                <span className="w-24 text-[#6f727c] text-sm">
                  방 생성 횟수
                </span>
                <span className="text-[#1b1c1f] text-sm">13</span>
              </div>
              <div className="flex">
                <span className="w-24 text-[#6f727c] text-sm">회원 가입일</span>
                <span className="text-[#1b1c1f] text-sm">
                  2025년 07월 07일(D+60)
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

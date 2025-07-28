"use client";

import { User, FileText, List, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function StudyInterviewerPage() {
  return (
    <div className="min-h-screen bg-[#efeff3] p-6">
      {/* Top Navigation Tabs */}
      <div className="flex gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Button
            key={i}
            className="bg-[#2b7fff] hover:bg-[#2b7fff]/90 text-white px-4 py-2 rounded-sm flex items-center gap-2"
          >
            최적빛
            <User className="w-4 h-4" />
            <FileText className="w-4 h-4" />
            <List className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Left Section */}
        <div className="flex-1">
          {/* Profile Photo Section */}
          <Card className="bg-white p-4 mb-4 relative">
            <div className="aspect-video relative rounded-lg overflow-hidden">
              {/* Video Controls */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white bg-black/20 hover:bg-black/40"
                >
                  <Pause className="w-4 h-4" />
                </Button>
                <div className="bg-black/20 rounded px-2 py-1">
                  <div className="w-32 h-1 bg-white/30 rounded">
                    <div className="w-8 h-1 bg-white rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Icons */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              <div className="bg-black rounded p-2">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="bg-black rounded p-2">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="bg-black rounded p-2">
                <List className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>

          {/* Blue Text Box */}
          <Card className="bg-[#2b7fff] text-white p-4">
            <p className="text-sm leading-relaxed">
              발음과 질문에 대한 답변이 정확합니다.
              <br />
              토한 답답이 무체적이라서 설득력이 있습니다.
            </p>
          </Card>
        </div>

        {/* Right Section - Resume */}
        <div className="flex-1">
          <Card className="bg-white p-6">
            {/* Header with Photo and Basic Info */}
            <div className="flex gap-4 mb-6">
              <div className="w-24 h-32 bg-gray-200 rounded overflow-hidden"></div>

              <div className="flex-1">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      이름
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      김영희 (초등학교, Kim Young Hee)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      주민등록번호
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      880419 - XXXXXXX
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      성별/생일
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      19880419 여성 (만 31세)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      전화
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      집전화: 02-123-4567
                    </td>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      E-mail
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      jsu@naver.com
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      휴대폰
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      휴대전화: 010-1234-5678
                    </td>
                    <td className="border border-gray-300 bg-gray-100 px-2 py-1 font-medium">
                      비상연락처
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      010-9456-7890
                    </td>
                  </tr>
                </table>
              </div>
            </div>

            {/* Education History */}
            <div className="mb-6">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-[#2b7fff] text-white">
                    <th className="border border-gray-300 px-2 py-1">기간</th>
                    <th className="border border-gray-300 px-2 py-1">
                      출신학교명
                    </th>
                    <th className="border border-gray-300 px-2 py-1">전공</th>
                    <th className="border border-gray-300 px-2 py-1">
                      졸업구분
                    </th>
                    <th className="border border-gray-300 px-2 py-1">학점</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-[#2b7fff] text-white px-2 py-1 font-medium">
                      학력사항
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      2000.03 ~ 2001.02
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      서울대학교
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      서울대학교
                    </td>
                    <td className="border border-gray-300 px-2 py-1">졸업</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1">
                      2001.03 ~ 2004.02
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      서울대학교대학교
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      서울대학교
                    </td>
                    <td className="border border-gray-300 px-2 py-1">졸업</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Work Experience */}
            <div className="mb-6">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-[#2b7fff] text-white">
                    <th className="border border-gray-300 px-2 py-1">종류</th>
                    <th className="border border-gray-300 px-2 py-1">시험명</th>
                    <th className="border border-gray-300 px-2 py-1">취득일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      className="border border-gray-300 bg-[#2b7fff] text-white px-2 py-1 font-medium"
                      rowSpan={3}
                    >
                      자격증
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      워드프로세서 1급
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      산업인력관리공단
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      2010.07.24
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">
                      전산회계 1급
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      한국세무사회
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      2009.06.25
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">
                      전산세무 2급
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      한국세무사회
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      2009.09.24
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Additional Sections */}
            <div className="space-y-4">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <tr>
                  <td className="border border-gray-300 bg-[#2b7fff] text-white px-2 py-1 font-medium">
                    신장
                  </td>
                  <td className="border border-gray-300 px-2 py-1">체중</td>
                  <td className="border border-gray-300 px-2 py-1">혈액형</td>
                  <td className="border border-gray-300 px-2 py-1">시력</td>
                  <td className="border border-gray-300 bg-[#2b7fff] text-white px-2 py-1 font-medium">
                    기타
                  </td>
                  <td className="border border-gray-300 px-2 py-1">종교</td>
                  <td className="border border-gray-300 px-2 py-1">취미</td>
                  <td className="border border-gray-300 px-2 py-1">특기</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 bg-[#2b7fff] text-white px-2 py-1 font-medium">
                    신체사항
                  </td>
                  <td className="border border-gray-300 px-2 py-1">155cm</td>
                  <td className="border border-gray-300 px-2 py-1">48kg</td>
                  <td className="border border-gray-300 px-2 py-1">양호</td>
                  <td className="border border-gray-300 px-2 py-1">
                    좌(2) 우(2)
                  </td>
                  <td className="border border-gray-300 px-2 py-1">무교</td>
                  <td className="border border-gray-300 px-2 py-1">스포츠</td>
                  <td className="border border-gray-300 px-2 py-1">
                    노래부르기
                  </td>
                </tr>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

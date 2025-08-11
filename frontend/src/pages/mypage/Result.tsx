import React from 'react';
import MypageLayout from '@/layouts/MypageLayout';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/util/date';
import EmptyState from '@/components/mypage/result/EmptyState';
import CarouselNavigation from '@/components/mypage/result/CarouselNavigation';
import EditableTitle from '../../components/mypage/result/EditableTitle';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const [reportList, setReportList] = React.useState(mockReportList); // 추후 API 연동 시 대체

  // 제목 수정 핸들러
  const handleTitleChange = (reportId: string, newTitle: string) => {
    setReportList(prev => 
      prev.map(report => 
        report.report_id === reportId 
          ? { ...report, title: newTitle }
          : report
      )
    );
  };

  // 결과 클릭 핸들러
  const handleResultClick = (reportId: string, resultId: string) => {
    console.log('Navigate to result detail:', reportId, resultId);
    // navigate(`/mypage/result/${reportId}/${resultId}`);
  };

  return (
    <MypageLayout activeMenu="result">
      {/* 페이지 제목 */}
      <h2 className="text-2xl font-semibold text-[#2B7FFF] mb-8 leading-[1.4]">
        AI 면접 결과
      </h2>

      {/* 결과가 없을 때 */}
      {reportList.length === 0 ? (
        <EmptyState />
      ) : (
        /* 결과가 있을 때 */
        <div className="flex flex-col gap-12 w-full">
          {reportList.map((report) => (
            <div key={report.report_id} className="w-full my-6">
              {/* 리포트 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <EditableTitle
                    reportId={report.report_id}
                    title={report.title}
                    onTitleChange={handleTitleChange}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-px h-6 bg-[#dedee4]"></div>
                  <span className="text-sm text-gray-500">
                    {formatDate(report.results[0]?.created_at || '')}
                  </span>
                </div>
              </div>

              {/* 결과 카드들 */}
              <CarouselNavigation
                reportId={report.report_id}
                results={report.results}
                onResultClick={handleResultClick}
              />
            </div>
          ))}
        </div>
      )}
    </MypageLayout>
  );
};

export default Result;

// Mock 데이터
const mockReportList = [
  {
    "report_id": "a1f1d8a3-4b9f-4f2b-9e1b-1b7f6f6c9e10",
    "title": "삼성 1차면접 준비",
    "results": [
      {
        "result_id": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2025-08-01T10:22:31Z",
        "status": "COMPLETED",
        "order": 1,
        "suborder": 0,
        "question": "공통 프로젝트에서 어떤 어려움이 있었나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "3f9c2e37-2d0a-4e6d-ae2c-85c769f0b74b",
        "created_at": "2025-08-01T10:40:02Z",
        "status": "COMPLETED",
        "order": 1,
        "suborder": 1,
        "question": "그 어려움을 어떻게 해결했나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "7a8b9c0d-1e2f-3g4h-5i6j-7k8l9m0n1o2p",
        "created_at": "2025-08-01T11:15:30Z",
        "status": "COMPLETED",
        "order": 2,
        "suborder": 0,
        "question": "팀 프로젝트에서 리더 역할을 맡은 경험이 있나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "9o8i7u6y-5t4r-3e2w-1q0p-9o8i7u6y5t4r",
        "created_at": "2025-08-01T11:30:15Z",
        "status": "COMPLETED",
        "order": 2,
        "suborder": 1,
        "question": "리더로서 가장 어려웠던 점은 무엇이었나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "1q2w3e4r-5t6y-7u8i-9o0p-1q2w3e4r5t6y",
        "created_at": "2025-08-01T11:45:45Z",
        "status": "IN_PROGRESS",
        "order": 3,
        "suborder": 0,
        "question": "최근에 관심을 가지고 있는 기술 트렌드는 무엇인가요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "7u8i9o0p-1q2w-3e4r-5t6y-7u8i9o0p1q2w",
        "created_at": "2025-08-01T12:00:20Z",
        "status": "COMPLETED",
        "order": 4,
        "suborder": 0,
        "question": "본인의 강점과 약점은 무엇인가요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=225&fit=crop&crop=center"
      }
    ]
  },
  {
    "report_id": "d4f2b91b-5c14-4ec1-9b2e-23a16a17ef54",
    "title": "삼성 2차면접 준비",
    "results": [
      {
        "result_id": "97d3f8c4-5374-4a20-91f1-7db6b0a1cf23",
        "created_at": "2025-08-03T09:15:10Z",
        "status": "COMPLETED",
        "order": 1,
        "suborder": 0,
        "question": "최근에 배운 기술 중 가장 흥미로웠던 것은 무엇인가요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "d12e97a8-86b3-4db6-a47a-96b493b1840f",
        "created_at": "2025-08-03T09:20:45Z",
        "status": "COMPLETED",
        "order": 1,
        "suborder": 1,
        "question": "그 기술을 프로젝트에 적용한다면 어떤 방식으로 할 건가요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "f8b2a91b-4c13-40bb-8e99-8a5dfe15b5c8",
        "created_at": "2025-08-03T09:25:00Z",
        "status": "COMPLETED",
        "order": 2,
        "suborder": 0,
        "question": "협업 시 가장 중요하게 생각하는 점은 무엇인가요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "a1b2c3d4-e5f6-7890-ab12-cd34ef56gh78",
        "created_at": "2025-08-03T09:40:15Z",
        "status": "COMPLETED",
        "order": 2,
        "suborder": 1,
        "question": "팀원과 의견이 충돌했을 때 어떻게 해결하나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "b2c3d4e5-f6a7-8901-bc23-de45fg67hi89",
        "created_at": "2025-08-03T09:55:30Z",
        "status": "IN_PROGRESS",
        "order": 3,
        "suborder": 0,
        "question": "업무 외에 개인적으로 하고 있는 프로젝트가 있나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90",
        "created_at": "2025-08-03T10:10:45Z",
        "status": "COMPLETED",
        "order": 4,
        "suborder": 0,
        "question": "우리 회사에 지원한 이유는 무엇인가요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=225&fit=crop&crop=center"
      },
      {
        "result_id": "d4e5f6a7-b8c9-0123-de45-fg67hi89jk01",
        "created_at": "2025-08-03T10:25:20Z",
        "status": "COMPLETED",
        "order": 4,
        "suborder": 1,
        "question": "회사의 어떤 부분이 가장 매력적으로 느껴지나요?",
        "thumbnail_url": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop&crop=center"
      }
    ]
  }
];
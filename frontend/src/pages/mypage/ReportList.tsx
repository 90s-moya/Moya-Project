import React from 'react';
import MypageLayout from '@/layouts/MypageLayout';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/util/date';
import EmptyState from '@/components/report/EmptyState';
import CarouselNavigation from '@/components/report/CarouselNavigation';
import EditableTitle from '@/components/report/EditableTitle';
import { getReportList } from '@/api/interviewApi';
import type { ReportList, ReportItem } from '@/types/interviewReport';

const ReportList: React.FC = () => {
  const navigate = useNavigate();
  const [reportList, setReportList] = React.useState<ReportList[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // API로 리포트 목록 조회
  React.useEffect(() => {
    const fetchReportList = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReportList();
        setReportList(data as ReportList[]);
      } catch (err) {
        console.error('리포트 목록 조회 실패:', err);
        setError('리포트 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportList();
  }, []);

  // 제목 수정 핸들러
  const handleTitleChange = (reportId: string, newTitle: string) => {
    // API 호출이 성공한 경우에만 로컬 상태 업데이트
    setReportList((prev) =>
      prev.map((report: ReportList) =>
        report.report_id === reportId ? { ...report, title: newTitle } : report
      )
    );
  };

  // 결과 클릭 핸들러
  const handleResultClick = (reportId: string, resultId: string, question: string, title: string, order: number, suborder: number) => {
    console.log('Navigate to result detail:', reportId, resultId);
    navigate(`/mypage/result/${reportId}/${resultId}`, {
      state: { question, title, order, suborder }
    });
  };

  return (
    <MypageLayout activeMenu="result">
      {/* 페이지 제목 */}
      <h2 className="text-2xl font-semibold text-[#2B7FFF] mb-8 leading-[1.4]">
        AI 면접 리포트
      </h2>

      {/* 로딩 중 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      ) : reportList.length === 0 ? (
        <EmptyState />
      ) : (
        /* 결과가 있을 때 */
        <div className="flex flex-col gap-12 w-full">
          {reportList.map((report: ReportList) => (
            <div key={report.report_id} className="w-full my-6">
              {/* 리포트 헤더 */}
              <div className="flex items-center justify-between mb-2">
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
                onResultClick={(reportId, resultId) => {
                  const result = report.results.find((r: ReportItem) => r.result_id === resultId);
                  handleResultClick(reportId, resultId, result?.question || '', report.title, result?.order || 0, result?.suborder || 0);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </MypageLayout>
  );
};

export default ReportList;
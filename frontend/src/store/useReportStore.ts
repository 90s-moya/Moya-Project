import { create } from 'zustand';

interface Result {
  result_id: string;
  created_at: string;
  status: string;
  order: number;
  suborder: number;
  question: string;
  thumbnail_url: string;
}

interface Report {
  report_id: string;
  title: string;
  results: Result[];
}

interface ReportStore {
  reportList: Report[];
  setReportList: (reports: Report[]) => void;
  updateReportTitle: (reportId: string, newTitle: string) => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  reportList: [],
  setReportList: (reports) => set({ reportList: reports }),
  updateReportTitle: (reportId, newTitle) =>
    set((state) => ({
      reportList: state.reportList.map((report) =>
        report.report_id === reportId
          ? { ...report, title: newTitle }
          : report
      ),
    })),
}));

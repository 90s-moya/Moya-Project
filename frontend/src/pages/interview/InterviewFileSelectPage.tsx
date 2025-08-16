// src/pages/interview/InterviewFileSelectPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DocsApi from "@/api/docsApi";
import { extractTextFromPdf } from "@/api/interviewApi";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";

type DocItem = {
  docsId: string;
  userId: string;
  fileUrl: string;
  docsStatus: "PORTFOLIO" | "RESUME" | "COVERLETTER";
};

type DocUrls = {
  resumeUrl?: string;
  portfolioUrl?: string;
  coverletterUrl?: string;
};

type DocType = "RESUME" | "PORTFOLIO" | "COVERLETTER";

const STATUS_LABEL: Record<DocType, string> = {
  RESUME: "이력서",
  PORTFOLIO: "포트폴리오",
  COVERLETTER: "자기소개서",
};

function toFileUrl(originalUrl: string) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  const fileBase = import.meta.env.VITE_FILE_URL || "";
  if (!originalUrl) return originalUrl;
  return originalUrl.startsWith(apiBase) ? originalUrl.replace(apiBase, fileBase) : originalUrl;
}

const safe = (s?: string) => (s ?? "").trim();

function toInitialSelected(docs: DocItem[]): DocUrls {
  const acc: DocUrls = {};
  for (const d of docs) {
    if (d.docsStatus === "RESUME" && !acc.resumeUrl) acc.resumeUrl = safe(d.fileUrl);
    if (d.docsStatus === "PORTFOLIO" && !acc.portfolioUrl) acc.portfolioUrl = safe(d.fileUrl);
    if (d.docsStatus === "COVERLETTER" && !acc.coverletterUrl) acc.coverletterUrl = safe(d.fileUrl);
  }
  return acc;
}

function getNameFromUrl(u?: string): string {
  if (!u) return "";
  try {
    const url = new URL(u, window.location.origin);
    const seg = decodeURIComponent(url.pathname.split("/").pop() || "");
    return seg || u;
  } catch {
    return u || "";
  }
}

function prettyFileName(full: string): string {
  const base = getNameFromUrl(full);
  return (
    base
      .replace(/^[0-9a-f-]{12,}/i, "")
      .replace(/\[[^\]]*]/g, "")
      .replace(/_{2,}/g, "_")
      .replace(/^-+/, "")
      .trim() || base
  );
}

export default function InterviewFileSelectPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selected, setSelected] = useState<DocUrls>({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<DocType>("RESUME"); // 표 형태 탭 상태

  useEffect(() => {
    (async () => {
      const res = await DocsApi.getMyDocs();
      const data: DocItem[] = (res as any)?.data ?? res;
      setDocs(data);
      setSelected(toInitialSelected(data));
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<DocType, DocItem[]> = { RESUME: [], PORTFOLIO: [], COVERLETTER: [] };
    docs.forEach((d) => g[d.docsStatus].push(d));
    return g;
  }, [docs]);

  const onPick = (type: DocType, rawUrl: string) => {
    const url = safe(rawUrl);
    setSelected((prev) =>
      type === "RESUME"
        ? { ...prev, resumeUrl: url }
        : type === "PORTFOLIO"
        ? { ...prev, portfolioUrl: url }
        : { ...prev, coverletterUrl: url }
    );
  };

  const handleNext = async () => {
    const payload = {
      resumeUrl: selected.resumeUrl?.trim() ?? "",
      portfolioUrl: selected.portfolioUrl?.trim() ?? "",
      coverletterUrl: selected.coverletterUrl?.trim() ?? "",
    };
    try {
      setLoading(true);
      const extracted = await extractTextFromPdf(payload);
      navigate("/interview/modelist", { state: { ...extracted } });
    } catch (err: any) {
      const status = err?.response?.status;
      console.error("[/v1/pdf] failed:", status, err?.response?.data || err);
      alert(status === 401 ? "인증이 만료되었습니다. 다시 로그인해주세요." : "요청 실패. 콘솔 로그를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled =
    !selected.resumeUrl && !selected.portfolioUrl && !selected.coverletterUrl;

  const summary =
    [
      selected.resumeUrl ? "이력서 선택됨" : "",
      selected.portfolioUrl ? "포트폴리오 선택됨" : "",
      selected.coverletterUrl ? "자기소개서 선택됨" : "",
    ]
      .filter(Boolean)
      .join(" / ") || "선택된 서류 없음";

  // 현재 탭에서 선택된 파일명
  const currentPickedName = (() => {
    const raw =
      tab === "RESUME" ? selected.resumeUrl :
      tab === "PORTFOLIO" ? selected.portfolioUrl :
      selected.coverletterUrl;
    return raw ? prettyFileName(toFileUrl(raw)) : "-";
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 font-['Pretendard']">
      <Header scrollBg={false} />

      {/* Enhanced header section */}
      <div className="pt-20 bg-gradient-to-b from-blue-100/60 via-white to-transparent border-b border-blue-200/40 mt-10">
        <div className="mx-auto max-w-6xl px-6 pb-10">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-100/50">
                  STEP 1/3
                </span>
              </div>
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  서류 선택
                </h1>
              </div>
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <p className="text-lg text-slate-700 max-w-2xl">
                  탭에서 유형을 선택해 1개 이상 고르세요. <span className="font-semibold text-blue-600">AI가 서류를 분석해 인터뷰를 준비</span>합니다
                </p>
              </div>
            </div>

            <div className="hidden md:block max-w-sm text-right animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white/90 backdrop-blur-sm px-4 py-3 text-sm text-blue-700 shadow-lg shadow-blue-100/50">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                {summary}
              </div>
            </div>
          </div>          
        </div>
      </div>

      {/* Enhanced tab bar */}
      <div className="mx-auto max-w-6xl px-6 mt-6">
        <div
          role="tablist"
          aria-label="문서 유형"
          className="grid grid-cols-3 rounded-2xl border border-blue-200/60 bg-white/90 backdrop-blur-sm text-sm shadow-lg shadow-blue-100/30 overflow-hidden"
        >
          {(["RESUME", "PORTFOLIO", "COVERLETTER"] as DocType[]).map((t, i) => {
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={[
                  "h-14 w-full px-6 font-semibold transition-all duration-300 relative overflow-hidden",
                  "border-blue-200/60",
                  i !== 2 ? "border-r" : "",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white/80 text-slate-700 hover:bg-blue-50/80 hover:text-blue-700"
                ].join(" ")}
              >
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 animate-pulse" />
                )}
                <span className="relative z-10">{STATUS_LABEL[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enhanced main content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {STATUS_LABEL[tab]}
            </h2>
          </div>
        </header>

        {grouped[tab].length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 px-8 py-16 text-center animate-fade-in-up">
            <div className="text-6xl mb-4">📄</div>
            <div className="text-lg font-semibold text-slate-700 mb-2">
              등록된 {STATUS_LABEL[tab]}가 없습니다
            </div>
            <div className="text-sm text-slate-500">
              새로운 {STATUS_LABEL[tab]}를 업로드해주세요
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[tab].map((d, index) => {
              const raw = safe(d.fileUrl);
              const display = toFileUrl(raw);
              const checked =
                (tab === "RESUME" && selected.resumeUrl === raw) ||
                (tab === "PORTFOLIO" && selected.portfolioUrl === raw) ||
                (tab === "COVERLETTER" && selected.coverletterUrl === raw);

              return (
                <li key={d.docsId} className="animate-fade-in-up" style={{ animationDelay: `${0.1 * index}s` }}>
                  <label
                    className={[
                      "group relative block h-full cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300 transform hover:scale-105",
                      checked 
                        ? "border-blue-400 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 shadow-xl shadow-blue-200/50" 
                        : "border-slate-200/60 bg-white/90 backdrop-blur-sm hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-100/50"
                    ].join(" ")}
                    title={getNameFromUrl(display)}
                  >
                    <input
                      type="radio"
                      name={`pick-${tab}`}
                      checked={checked}
                      onChange={() => onPick(tab, raw)}
                      className="sr-only"
                      aria-label={`${STATUS_LABEL[tab]} 선택`}
                    />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-200 flex items-center justify-center shadow-inner">
                          <span className="text-xs font-bold text-blue-700">PDF</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-600">{STATUS_LABEL[d.docsStatus as DocType]}</span>
                      </div>
                      {/* <div
                        className={[
                          "h-5 w-5 rounded-full border-2 transition-all duration-300",
                          checked 
                            ? "border-blue-600 bg-blue-600 shadow-lg shadow-blue-500/25" 
                            : "border-slate-300 bg-white group-hover:border-blue-400"
                        ].join(" ")}
                        aria-hidden
                      /> */}
                    </div>

                    <div className="mb-4 text-sm font-semibold text-slate-900 line-clamp-2 leading-relaxed">
                      {prettyFileName(display)}
                    </div>

                    <div className="flex items-center">
                      <a
                        className="text-sm underline text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                        href={display}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        열기
                      </a>
                    </div>

                    {/* Selection indicator */}
                    {checked && (
                      <div className="absolute top-3 right-3">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      </div>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Enhanced bottom progress bar */}
      <div className="sticky bottom-0 z-10 border-t border-blue-200/60 bg-white/90 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-1">선택 요약</p>
            <p className="truncate text-sm font-semibold text-slate-700">{summary}</p>
          </div>

          <div className="flex items-center gap-4">
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                <span className="text-sm font-medium">분석 중...</span>
              </div>
            )}
            <Button
              disabled={loading || isNextDisabled}
              onClick={handleNext}
              className="group relative h-12 px-8 rounded-2xl text-base font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus-visible:ring-4 focus-visible:ring-blue-200/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="relative z-10">다음 단계로</span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

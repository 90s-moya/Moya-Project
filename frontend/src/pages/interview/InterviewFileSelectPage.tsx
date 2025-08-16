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
    <>
      <Header scrollBg={false} />

      {/* 상단 여백 고정 */}
      <div className="pt-20 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/60 mt-10">
        <div className="mx-auto max-w-5xl px-6 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                STEP 1/3
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">서류 선택</h1>
              <p className="mt-2 text-sm text-slate-600">
                탭에서 유형을 선택해 1개 이상 고르세요. AI가 서류를 분석해 인터뷰를 준비합니다
              </p>
            </div>

            <div className="hidden md:block max-w-sm text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {summary}
              </div>
            </div>
          </div>          
        </div>
      </div>

      {/* 표 형태 탭 바 */}
      <div className="mx-auto max-w-5xl px-6 mt-3">
        <div
          role="tablist"
          aria-label="문서 유형"
          className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white text-sm shadow-sm"
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
                  "h-11 w-full px-4 font-medium transition",
                  "border-slate-200",
                  i !== 2 ? "border-r" : "",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                ].join(" ")}
              >
                {STATUS_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 현재 탭 콘텐츠: 카드 그리드 */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
            <h2 className="text-base md:text-lg font-semibold text-slate-900">
              {STATUS_LABEL[tab]}
            </h2>
          </div>
        </header>

        {grouped[tab].length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            등록된 {STATUS_LABEL[tab]}가 없습니다
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[tab].map((d) => {
              const raw = safe(d.fileUrl);
              const display = toFileUrl(raw);
              const checked =
                (tab === "RESUME" && selected.resumeUrl === raw) ||
                (tab === "PORTFOLIO" && selected.portfolioUrl === raw) ||
                (tab === "COVERLETTER" && selected.coverletterUrl === raw);

              return (
                <li key={d.docsId}>
                  <label
                    className={[
                      "group relative block h-full cursor-pointer rounded-xl border p-4 transition",
                      checked ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-white hover:bg-slate-50",
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

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-slate-600">PDF</span>
                        </div>
                        <span className="text-xs text-slate-500">{STATUS_LABEL[d.docsStatus as DocType]}</span>
                      </div>
                      <div
                        className={[
                          "h-4 w-4 rounded-full border",
                          checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white",
                        ].join(" ")}
                        aria-hidden
                      />
                    </div>

                    <div className="mt-3 text-sm font-medium text-slate-900 line-clamp-2">
                      {prettyFileName(display)}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <a
                        className="text-xs underline text-blue-600 hover:text-blue-700"
                        href={display}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        열기
                      </a>
                      <span className="text-[11px] text-slate-500">클릭해서 선택</span>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* 하단 고정 진행 바 */}
      <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">선택 요약</p>
            <p className="truncate text-sm text-slate-700">{summary}</p>
          </div>

          <div className="flex items-center gap-3">
            {loading && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" aria-label="처리 중" />
            )}
            <Button
              disabled={loading || isNextDisabled}
              onClick={handleNext}
              className="rounded-full px-6"
            >
              다음
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

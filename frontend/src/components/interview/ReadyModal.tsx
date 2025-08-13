// src/components/interview/ReadyModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ReadyModalProps = {
  open: boolean
  onClose: () => void
  onStart: () => void
}

export default function ReadyModal({ open, onClose, onStart }: ReadyModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => {
      if (!isOpen) onClose()
    }}>
      <DialogContent
  className="p-8 !w-[80vw] !h-[80vh] !max-w-[90vw] !max-h-[90vh]">
  

<DialogHeader className="text-center">
  <DialogTitle className="text-3xl text-center font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mt-10">
    면접 진행 안내
  </DialogTitle>
  <p className="mt-2 text-sm text-center text-muted-foreground">
    부드러운 진행을 위해 아래 안내를 확인해 주세요.
  </p>
</DialogHeader>

<div className="mx-auto max-w-3xl text-center space-y-8">
  {/* 진행 흐름 */}
  <section className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-800">진행 흐름</h3>

    {/* 칩 + 화살표로 깔끔한 타임라인 */}
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">질문 1</span>
      <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">꼬리질문 1</span>
      <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">꼬리질문 2</span>
   
      <svg className="h-4 w-4 text-gray-300 mx-1 md:mx-2" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>

      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">질문 2</span>
      <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">꼬리질문 1</span>
      <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">꼬리질문 2</span>

      <svg className="h-4 w-4 text-gray-300 mx-1 md:mx-2" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>

      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">질문 3</span>
      <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">꼬리질문 1</span>
      <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">꼬리질문 2</span>
    </div>
  </section>

  {/* 가이드 체크리스트 */}
  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

  <section className="space-y-3">
    <ul className="mx-auto inline-block text-left space-y-3">
      <li className="flex items-start gap-3">
        <svg className="h-5 w-5 mt-0.5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0L3.293 9.957a1 1 0 1 1 1.414-1.414l3.04 3.04 6.543-6.543a1 1 0 0 1 1.417 0z"/></svg>
        <span>압박 모드에서는 <span className="font-semibold">질문당 최대 2개의 꼬리질문</span>이 이어질 수 있어요.</span>
      </li>
      <li className="flex items-start gap-3">
        <svg className="h-5 w-5 mt-0.5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0L3.293 9.957a1 1 0 1 1 1.414-1.414l3.04 3.04 6.543-6.543a1 1 0 0 1 1.417 0z"/></svg>
        <span>질문 음성 종료 후 <span className="font-semibold">3초 뒤</span> 답변이 시작되며, <span className="font-semibold">최대 1분</span> 동안 답변할 수 있어요.</span>
      </li>
    </ul>
  </section>

  <p className="text-sm text-muted-foreground">
    <span className="font-medium">시작</span>을 누르면 <span className="font-medium">3초 카운트다운</span> 후 면접이 바로 시작됩니다.
  </p>
</div>

  <DialogFooter className="flex justify-center gap-2">
    <Button variant="outline" onClick={onClose}>취소</Button>
    <Button onClick={onStart}>시작</Button>
  </DialogFooter>
</DialogContent>

    </Dialog>
  )
}

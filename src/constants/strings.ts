// 기록 앱 전환에서 쓰는 문구 상수. 압박·상실 프레임("끊겼습니다" 등) 금지 —
// 스트릭이 끊겨도 다음 기회를 여는 톤을 유지한다.
export const TODAY_SCREEN = {
  headerTitle: '하루 한 질문',
  guide: '정답은 없어요. 편하게 생각을 남겨보세요.',
  writeButton: '생각 남기기',
} as const;

export const WRITE_SCREEN = {
  placeholder: '편하게 적어보세요...',
  saveButton: '저장',
  savingButton: '저장 중...',
  completeTitle: '오늘도 생각했네!',
  backToToday: '오늘 화면으로',
} as const;

export const REACTION = {
  askButton: '반응 받아볼래?',
  loadingButton: '생각하는 중...',
} as const;

export const CALENDAR_SCREEN = {
  headerTitle: '캘린더',
  emptyState: '아직 기록이 없어요. 오늘의 질문에 생각을 남겨보세요.',
} as const;

export const streakLabel = (n: number): string => `🔥 ${n}일째 생각 중`;

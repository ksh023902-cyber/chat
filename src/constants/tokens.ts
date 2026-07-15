// 새 화면(기록 앱 전환)에서 사용하는 여백·폰트 크기 상수.
// 기존 화면(Home/Chat/Ending 등)은 width 비례 인라인 스타일을 유지하지만,
// 이번 전환으로 새로 만드는 화면은 인라인 하드코딩 없이 이 상수만 참조한다.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const fontSize = {
  sub: 13,
  body: 16,
  title: 22,
} as const;

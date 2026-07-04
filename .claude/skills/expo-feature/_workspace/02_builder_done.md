# Builder 완료 보고서

## 수정 파일 목록

| 파일 | 주요 변경 |
|------|-----------|
| `src/services/apiConfig.ts` | base URL을 네이티브 Gemini REST로 변경, 키 검증을 `trim().length < 10`으로 완화 |
| `src/services/claude.ts` | `messagesToGeminiFormat()` export 함수 신설, `apiRequest`를 네이티브 endpoint+key query param 방식으로 재작성, Bearer 헤더 제거, 응답 파싱을 `candidates[0].content.parts[0].text`로 변경 |
| `src/services/harness.ts` | `messagesToGeminiFormat` import 추가, `callLLM`을 네이티브 Gemini REST로 재작성, Bearer 헤더 제거, 응답 파싱 동일 경로 사용 |

## 완료 기준 체크리스트

- [x] `Authorization: Bearer` 헤더가 코드 어디에도 없음 (grep 확인)
- [x] 응답 파싱이 `candidates[0].content.parts[0].text` 경로 사용 (claude.ts, harness.ts 양쪽)
- [x] `messagesToGeminiFormat()`이 단일 함수로 claude.ts에서 export, harness.ts에서 import하여 공유
- [x] 키 검증이 빈값/공백 체크만 수행 (`trim().length < 10`)
- [x] TypeScript 컴파일 에러 없음 (`npx tsc --noEmit` 통과)

# QraftCode Zen

QraftCode Zen은 Provider 라우팅을 유지하는 OpenAI 호환 API Gateway입니다. `src/lib/gateway.ts`가 각 Provider의 base URL, adapter, server-side key를 계속 소유하며, 웹·CLI 정책은 별도 `src/lib/policy.ts`에서 적용됩니다.

## 정책

- 웹은 이메일 형식의 최소 가입 후 서명 HttpOnly 세션 쿠키가 있어야 채팅과 모델 목록을 사용할 수 있습니다.
- 가입 사용자와 크레딧 계정은 외부 인증 DB 없이 프로세스 메모리에 저장되는 best-effort 구현입니다. 인스턴스 재시작/서버리스 인스턴스 교체 시 초기화되므로 운영에서는 영속 인증·사용량 저장소로 교체해야 합니다.
- `AUTH_SECRET`은 세션 서명에 사용됩니다. **프로덕션에서는 반드시 충분히 긴 무작위 `AUTH_SECRET`을 설정해야 하며, 기본값은 로컬 개발 전용입니다.**
- 기본 크레딧은 web 50, CLI 100입니다. chat completion과 code complete 요청마다 1 credit을 차감합니다.
- API 요청은 `x-client-type: web|cli` 또는 JSON body의 `clientType`을 인식합니다. 미지정은 web이며, CLI는 API key가 있으면 key 기준, 없으면 IP 기준으로 식별합니다.
- rate limit은 web 30 requests/min, CLI 60 requests/min이며, 저장소가 메모리 기반인 best-effort 제한입니다. 모든 정책 응답에는 `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-credit-limit`, `x-credit-remaining` 헤더가 포함됩니다.
- `/api/v1/ads/config`은 web보다 CLI에 더 많은 슬롯을 반환합니다. Meta Audience Network 웹 publisher tag는 공식 승인 후 발급된 값만 사용하며, 임의의 URL·Placement ID를 만들지 않습니다. 발급받은 공식 tag URL과 placement ID를 `NEXT_PUBLIC_META_AUDIENCE_NETWORK_TAG_URL`, `NEXT_PUBLIC_META_AUDIENCE_NETWORK_WEB_PLACEMENT_ID`에 설정하면 `MetaAudienceAd`가 로드합니다. 값이 없으면 광고 요청을 보내지 않습니다.
- 현재 Meta 공식 Audience Network Quick Start는 Android, iOS, Unity 앱 SDK를 기준으로 안내합니다. 웹 publisher tag를 사용하려면 Meta가 계정에 별도로 발급한 공식 tag를 받아야 하며, 계정 연결만으로 자동 생성되지는 않습니다.
- `/api/health`에 위 정책 상태와 `authSecretRequiredInProduction`을 노출합니다.

## 개발

```bash
npm run typecheck
npm run build
npm run dev
```

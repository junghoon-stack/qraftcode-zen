# QraftCode CLI

QraftCode Zen OpenAI 호환 게이트웨이를 터미널에서 사용하는 CLI입니다. 기본 모델은 `auto`이며, 서버가 키리스·무료 Provider를 우선 선택합니다.

## 설치 및 실행

현재 저장소에서 바로 설치하려면:

```bash
cd qraftcode-cli
npm install -g .
qraft ask "Node.js로 REST API를 설계해줘"
```

npm에 게시된 패키지가 아닌 상태에서는 `npm install -g qraftcode/cli`를 사용하지 않습니다. GitHub 저장소에 CLI가 별도로 게시된 뒤에만 GitHub 설치 명령을 사용할 수 있습니다.

## 명령

```bash
qraft chat
qraft ask "1+1은 얼마인가요?"
qraft ask "이 함수를 최적화해줘" --model openrouter:openai/gpt-4o-mini
qraft models
qraft providers
```

## 설정

```bash
export QRAFTCODE_API_URL="https://qraftcode.vercel.app/api/v1"
export QRAFTCODE_MODEL="auto"
```

프롬프트와 API 키는 광고 파트너에게 전달하지 않으며, API 키는 QraftCode Zen 서버 측에서만 사용합니다.

'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import MetaAudienceAd from './components/MetaAudienceAd'

type Model = { id: string; name: string; provider: string; free: boolean; context?: number; creditCost?: number; keyless?: boolean }
  type Provider = { id: string; name: string; status: string; keyless?: boolean; env?: string; baseUrl?: string | null }
type Message = { role: 'user' | 'assistant'; content: string }

const providerMarks: Record<string, { mark: string; tone: string }> = {
  openrouter: { mark: 'OR', tone: 'violet' },
  google: { mark: 'G', tone: 'blue' },
  nvidia: { mark: 'N', tone: 'green' },
  cohere: { mark: 'C', tone: 'orange' },
  recursive: { mark: 'R', tone: 'cyan' },
  stealth: { mark: 'S', tone: 'red' },
  dots: { mark: 'D', tone: 'pink' },
  airforce: { mark: 'AF', tone: 'slate' },
}

function ProviderMark({ provider }: { provider: string }) {
  const key = provider.toLowerCase().split(':')[0].split('/')[0]
  const item = providerMarks[key] || { mark: key.slice(0, 2).toUpperCase(), tone: 'slate' }
  return <span className={`provider-mark ${item.tone}`} aria-hidden="true">{item.mark}</span>
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [model, setModel] = useState('auto')
  const [freeOnly, setFreeOnly] = useState(true)
  const [modelOpen, setModelOpen] = useState(false)
  const [tab, setTab] = useState<'chat' | 'complete'>('chat')
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'ZEN GATEWAY ONLINE. 모델을 고르고 작업을 시작하세요.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [notice, setNotice] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [completion, setCompletion] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({})
  const [savingProvider, setSavingProvider] = useState('')

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((s) => {
      setAuthenticated(s.authenticated)
      if (s.email) setEmail(s.email)
    })
  }, [])

  const loadCatalog = useCallback(async () => {
    setLoadingModels(true)
    setNotice('')
    try {
      const [modelResponse, providerResponse] = await Promise.all([
        fetch('/api/v1/models', { cache: 'no-store' }),
        fetch('/api/v1/providers', { cache: 'no-store' }),
      ])
      const modelData = await modelResponse.json()
      const providerData = await providerResponse.json()
      if (!modelResponse.ok) throw new Error(modelData.error?.message || '모델 목록을 불러오지 못했습니다.')
      setModels(modelData.data || [])
      setProviders(providerData.data || [])
      if (!model && modelData.data?.[0]) setModel(modelData.data[0].id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '카탈로그를 불러오지 못했습니다.')
    } finally {
      setLoadingModels(false)
    }
  }, [model])

  useEffect(() => { if (authenticated) void loadCatalog() }, [authenticated, loadCatalog])

  const visibleModels = useMemo(() => models.filter((item) => !freeOnly || item.free), [models, freeOnly])
  const liveProviders = providers.filter((provider) => provider.status === 'configured').length

  async function register(event: FormEvent) {
    event.preventDefault()
    setRegistering(true)
    setNotice('')
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || '등록에 실패했습니다.')
      setAuthenticated(true)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '등록에 실패했습니다.')
    } finally { setRegistering(false) }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault()
    if (!input.trim() || busy || !authenticated) return
    const next = [...messages, { role: 'user' as const, content: input.trim() }]
    setMessages(next); setInput(''); setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', 'x-client-type': 'web' }, body: JSON.stringify({ model: model || 'auto', messages: next, stream: false }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Gateway request failed.')
      setMessages([...next, { role: 'assistant', content: data.choices?.[0]?.message?.content || '응답이 비어 있습니다.' }])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Gateway request failed.')
      setMessages(next)
    } finally { setBusy(false) }
  }

  async function complete() {
    setBusy(true); setCompletion(''); setNotice('')
    try {
      const response = await fetch('/api/v1/complete', { method: 'POST', headers: { 'content-type': 'application/json', 'x-client-type': 'web' }, body: JSON.stringify({ model: model || 'auto', language, prefix, suffix }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Completion request failed.')
      setCompletion(data.completion || 'No completion')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Completion request failed.') }
    finally { setBusy(false) }
  }

  async function saveProviderKey(provider: Provider) {
    const apiKey = providerKeys[provider.id]?.trim()
    if (!apiKey) return setNotice('API 키를 입력하세요.')
    setSavingProvider(provider.id); setNotice('')
    try {
      const response = await fetch('/api/settings/providers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: provider.id, apiKey }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Provider 설정에 실패했습니다.')
      setProviderKeys((current) => ({ ...current, [provider.id]: '' })); setNotice(`${provider.name} 키를 서버 세션에 저장했습니다.`); await loadCatalog()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Provider 설정에 실패했습니다.') }
    finally { setSavingProvider('') }
  }

  if (!authenticated) return <main className="gate"><div className="gate-card"><div className="brand"><img src="/logo.svg" alt="QraftCode" /><small>ZEN / GATEWAY</small></div><div className="gate-kicker">OPEN MODEL ACCESS / 01</div><h1>Build with signal.<br /><span>Ship with confidence.</span></h1><p>가벼운 이메일 등록 후 멀티 Provider 모델과 코드 완성 기능을 사용할 수 있습니다.</p><form onSubmit={register}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><button disabled={registering}>{registering ? 'JOINING...' : 'JOIN ZEN ↗'}</button></form>{notice && <p className="notice">{notice}</p>}<small className="muted">QraftCode Zen · 서버 측 키 보관 · OpenAI 호환 API</small></div></main>

  return <main className="shell">
    <aside>
      <div className="brand"><img src="/logo.svg" alt="QraftCode" /><small>ZEN / GATEWAY</small></div>
      <div className="side-title">PROVIDERS <b>{liveProviders}/{providers.length}</b></div>
      <div className="provider-list">{providers.map((provider) => <div className="provider" key={provider.id}><i className={provider.status === 'configured' ? 'on' : ''} />{provider.name}<em>{provider.keyless ? 'KEYLESS' : provider.status === 'configured' ? 'LIVE' : 'OFF'}</em></div>)}</div>
      <MetaAudienceAd label="META / WEB BANNER" />
      <div className="side-footer"><strong>WEB CREDITS 50</strong><br /><span>{email}</span></div>
    </aside>
    <section className="main">
      <header><div><p className="eyebrow">MULTI-PROVIDER AI WORKSPACE</p><h1>Build with signal.<br /><span>Ship with confidence.</span></h1><p className="subhead">One gateway. Hundreds of models. A clean path from prompt to production.</p></div><div className="telemetry"><button className="settings-button" onClick={() => setSettingsOpen(true)}>⚙ API SETTINGS</button><strong><i className="on" /> SYSTEM OPERATIONAL</strong><small>{models.length.toLocaleString()} models · {models.filter((item) => item.free).length} free</small><small>WEB / 50 CREDITS</small></div></header>
      <div className="toolbar"><div className="model-picker"><label>MODEL ROUTE · {visibleModels.length} CURATED FREE</label><button className="model-trigger" onClick={() => setModelOpen((open) => !open)} aria-expanded={modelOpen}><ProviderMark provider={models.find((item) => item.id === model)?.provider || 'auto'} /><span>{models.find((item) => item.id === model)?.name || 'Auto · quality free routing'}</span><b>{modelOpen ? '⌃' : '⌄'}</b></button>{modelOpen && <div className="model-menu">{visibleModels.map((item) => <button className={item.id === model ? 'selected' : ''} value={item.id} onClick={() => { setModel(item.id); setModelOpen(false) }} key={item.id}><ProviderMark provider={item.provider} /><span><strong>{item.name}</strong><small>{item.provider} · {item.creditCost ?? 1} credits</small></span>{item.id === model && <i>✓</i>}</button>)}</div>}</div><label className="toggle"><input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} /><span />FREE ONLY</label><button className="refresh" onClick={() => void loadCatalog()} disabled={loadingModels}>{loadingModels ? 'SYNCING...' : '↻ SYNC MODELS'}</button><div className="tabs"><button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>CHAT</button><button className={tab === 'complete' ? 'active' : ''} onClick={() => setTab('complete')}>CODE COMPLETE</button></div></div>
      {notice && <div className="notice bar">{notice}</div>}
      {tab === 'chat' ? <div className="workspace"><div className="messages">{messages.map((message, index) => <div className={'message ' + message.role} key={index}><span className="role">{message.role === 'user' ? 'YOU' : 'ZEN'}</span><div>{message.content}</div></div>)}{busy && <div className="message assistant"><span className="role">ZEN</span><div className="pulse">processing ···</div></div>}</div><form onSubmit={send} className="composer"><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your gateway anything..." /><button disabled={busy}>{busy ? 'RUNNING...' : 'SEND ↗'}</button></form></div> : <div className="complete"><div className="editor"><div className="editor-head"><span>EDITOR / {language.toUpperCase()}</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>typescript</option><option>python</option><option>javascript</option><option>rust</option><option>go</option></select></div><textarea value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="Paste code context here..." /><textarea value={suffix} onChange={(event) => setSuffix(event.target.value)} placeholder="Optional suffix / expected ending..." /></div><div className="completion-result"><div className="editor-head"><span>SUGGESTION</span><span className="live">AI LIVE</span></div><pre>{completion || '// Your completion will appear here\n// powered by the selected gateway model'}</pre><button onClick={() => void complete()} disabled={busy}>{busy ? 'RUNNING...' : 'GENERATE COMPLETION ↗'}</button></div></div>}
      <footer><span>QRAFTCODE ZEN · OPENAI-COMPATIBLE GATEWAY</span><span>HEALTH /api/health · API /api/v1</span></footer>
      {settingsOpen && <div className="settings-backdrop" onClick={() => setSettingsOpen(false)}><section className="settings-panel" onClick={(event) => event.stopPropagation()}><div className="settings-head"><div><p className="eyebrow">SERVER-SIDE PROVIDER CONFIG</p><h2>API SETTINGS</h2></div><button className="settings-close" onClick={() => setSettingsOpen(false)}>×</button></div><p className="settings-note">BYOK를 요구하지 않습니다. 입력한 키는 브라우저에 저장하지 않고 현재 서버 세션 메모리에만 전달합니다. 운영 환경에서는 Vercel 환경변수 설정이 가장 안전합니다.</p><div className="settings-list">{providers.map((provider) => <div className="settings-row" key={provider.id}><div><strong>{provider.name}</strong><small>{provider.baseUrl || 'Base URL 미설정'} · {provider.keyless ? 'KEYLESS / no key required' : provider.env}</small></div>{provider.keyless ? <em className="keyless-badge">KEYLESS</em> : <div className="key-input"><input type="password" autoComplete="off" value={providerKeys[provider.id] || ''} onChange={(event) => setProviderKeys((current) => ({ ...current, [provider.id]: event.target.value }))} placeholder={provider.status === 'configured' ? '서버 키가 설정됨 · 교체' : 'API key 입력'} /><button onClick={() => void saveProviderKey(provider)} disabled={savingProvider === provider.id}>{savingProvider === provider.id ? 'SAVING' : 'SAVE'}</button></div>}</div>)}</div></section></div>}
    </section>
  </main>
}

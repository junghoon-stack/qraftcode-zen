'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { placement?: string; label?: string }

/**
 * Meta Audience Network adapter.
 * The official tag is loaded only when both public environment values exist.
 * Until then, a non-tracking house sponsor slot is shown instead of inventing a Meta tag.
 */
export default function MetaAudienceAd({ placement, label = 'META AUDIENCE NETWORK' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const tagUrl = process.env.NEXT_PUBLIC_META_AUDIENCE_NETWORK_TAG_URL
  const placementId = placement || process.env.NEXT_PUBLIC_META_AUDIENCE_NETWORK_WEB_PLACEMENT_ID

  useEffect(() => {
    if (!tagUrl || !placementId || !ref.current) return
    const script = document.createElement('script')
    script.src = tagUrl
    script.async = true
    script.dataset.placementId = placementId
    script.dataset.publisher = 'qraftcode'
    script.onload = () => setLoaded(true)
    ref.current.appendChild(script)
    return () => script.remove()
  }, [tagUrl, placementId])

  if (!tagUrl || !placementId) return <div className="ad-slot" aria-label="QraftCode sponsor slot"><strong>SPONSOR / QRAFTCODE</strong><p>개발자를 위한 AI gateway. 광고 수익은 무료 모델 운영에 사용됩니다.</p><a href="https://qraftcode.vercel.app" target="_blank" rel="noreferrer">EXPLORE ZEN ↗</a></div>

  return <div className="ad-slot" aria-label={label} data-ad-provider="meta-audience-network" data-placement-id={placementId}><strong>{loaded ? label : 'AD LOADING'}</strong><div ref={ref} /></div>
}

'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  placement?: string
  label?: string
}

/**
 * Meta Audience Network web publisher adapter.
 *
 * No URL or placement is invented here. The component is inert until the
 * publisher receives an official tag URL and placement ID from Meta and sets:
 * NEXT_PUBLIC_META_AUDIENCE_NETWORK_TAG_URL
 * NEXT_PUBLIC_META_AUDIENCE_NETWORK_WEB_PLACEMENT_ID
 */
export default function MetaAudienceAd({ placement, label = 'META AUDIENCE NETWORK' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [configured, setConfigured] = useState(false)
  const tagUrl = process.env.NEXT_PUBLIC_META_AUDIENCE_NETWORK_TAG_URL
  const placementId = placement || process.env.NEXT_PUBLIC_META_AUDIENCE_NETWORK_WEB_PLACEMENT_ID

  useEffect(() => {
    if (!tagUrl || !placementId || !ref.current) return
    setConfigured(true)
    const script = document.createElement('script')
    script.src = tagUrl
    script.async = true
    script.dataset.placementId = placementId
    script.dataset.publisher = 'qraftcode'
    ref.current.appendChild(script)
    return () => script.remove()
  }, [tagUrl, placementId])

  if (!tagUrl || !placementId) return null

  return (
    <aside className="ad-slot" aria-label={label} data-ad-provider="meta-audience-network" data-placement-id={placementId}>
      <span>{configured ? label : 'AD LOADING'}</span>
      <div ref={ref} />
    </aside>
  )
}

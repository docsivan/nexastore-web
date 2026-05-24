'use client'

import { useEffect } from 'react'
import { getOrCreateSessionId } from '@/lib/sessionId'

interface Props {
  itemCode: string
  pageUrl:  string
}

export default function SignalCapture({ itemCode, pageUrl }: Props) {
  useEffect(() => {
    const sessionId = getOrCreateSessionId()
    fetch('/api/nexa/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal_type: 'view',
        session_id:  sessionId,
        item_code:   itemCode,
        action:      'product_view',
        page_url:    pageUrl,
      }),
    }).catch(() => {})
  }, [itemCode, pageUrl])

  return null
}

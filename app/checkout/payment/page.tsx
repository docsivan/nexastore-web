import { Suspense } from 'react'
import PaymentContent from './PaymentContent'

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="container-page py-14 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="font-body text-slate-muted text-sm mt-4">Loading payment details…</p>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}

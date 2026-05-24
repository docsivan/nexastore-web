import { Suspense } from 'react'
import FailedContent from './FailedContent'

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="container-page py-14 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
      </div>
    }>
      <FailedContent />
    </Suspense>
  )
}

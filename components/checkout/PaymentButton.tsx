'use client'

interface Props {
  loading: boolean
  disabled?: boolean
  onClick: () => void
  total: string
}

export default function PaymentButton({ loading, disabled, onClick, total }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="btn-accent w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Redirecting to PayTabs…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Pay {total} Securely
        </>
      )}
    </button>
  )
}

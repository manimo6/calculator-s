import React from "react"

export default function Toast({ message }) {
  if (!message) return null
  return (
    <div className="fixed left-1/2 top-6 z-[9999] w-fit max-w-[90vw] -translate-x-1/2 rounded-full bg-zinc-900/90 px-5 py-3 text-center text-sm font-semibold text-zinc-50 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70 whitespace-pre-line">
      {message}
    </div>
  )
}

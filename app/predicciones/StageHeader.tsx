'use client'

import Image from 'next/image'
import { useState } from 'react'

export function StageHeader({ stage }: { stage: string }) {
  return (
    <div className="px-3 pt-4">
      <div
        className="rounded-2xl bg-white px-4 py-3 flex items-center gap-2"
        style={{
          boxShadow:
            '0 4px 20px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)',
        }}
      >
        <FifaLogo size={42} />
        <div className="flex flex-col leading-none">
          <span
            className="text-[9px] font-black uppercase tracking-[0.22em]"
            style={{ color: '#b58900' }}
          >
            FIFA World Cup 26
          </span>
          <span
            className="text-[13px] font-black tracking-wide mt-1"
            style={{ color: '#0a1628' }}
          >
            {stage}
          </span>
        </div>
      </div>
    </div>
  )
}

export function FifaLogo({ size = 40 }: { size?: number }) {
  const [ok, setOk] = useState(true)
  if (ok) {
    return (
      <Image
        src="/fifa26-logo.png"
        alt="FIFA World Cup 26"
        width={size}
        height={size}
        className="object-contain shrink-0"
        onError={() => setOk(false)}
        unoptimized
      />
    )
  }
  return (
    <div
      className="rounded-md flex items-center justify-center shrink-0"
      style={{ background: '#FFD100', width: size, height: size }}
    >
      <span
        className="font-black"
        style={{ color: '#0a1628', fontSize: Math.round(size * 0.35) }}
      >
        26
      </span>
    </div>
  )
}

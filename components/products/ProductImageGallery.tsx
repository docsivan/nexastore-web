'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
  name: string
}

export default function ProductImageGallery({ images, name }: Props) {
  const [active, setActive] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="card aspect-square relative overflow-hidden bg-surface">
        <Image
          src={images[active]}
          alt={name}
          fill
          className="object-contain p-8 transition-opacity duration-200"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                i === active ? 'border-primary' : 'border-border hover:border-primary-light'
              }`}
            >
              <Image
                src={img}
                alt={`${name} image ${i + 1}`}
                fill
                className="object-contain p-2"
                sizes="64px"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

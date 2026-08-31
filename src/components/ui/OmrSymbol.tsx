import Image from 'next/image'

type Variant = 'dark' | 'light' | 'gold' | 'black' | 'white' | 'navy' | 'navy_mid'

interface OmrSymbolProps {
  variant?: Variant
  size?: number        // px, applied to both width and height
  className?: string
}

/**
 * Official Omani Rial symbol as mandated by the Central Bank of Oman (CBO).
 *
 * Variant guide:
 *  - dark      → on white / light backgrounds (default)
 *  - light     → on mid-tone backgrounds
 *  - gold      → on amber / yellow HQ theme elements
 *  - black     → maximum contrast on white
 *  - white     → on dark / colored backgrounds (e.g. sidebar)
 *  - navy      → on light backgrounds with navy branding
 *  - navy_mid  → on mid-tone navy contexts
 */
export default function OmrSymbol({ variant = 'dark', size = 20, className = '' }: OmrSymbolProps) {
  return (
    <Image
      src={`/currency/omr_${variant}.png`}
      alt="Omani Rial"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

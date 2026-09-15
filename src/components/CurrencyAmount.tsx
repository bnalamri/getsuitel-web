/**
 * CurrencyAmount — renders a monetary amount tagged with whichever
 * currency it actually belongs to (OMR gets the official CBO symbol
 * image, per house style; everything else renders as plain text —
 * same pattern already used on /pricing's PriceTag).
 *
 * Use this anywhere a value's currency varies by row/branch (e.g.
 * branch_billing, which now carries its own `currency` column — see
 * 20260915l_branch_currency.sql). Do NOT use this to replace OmrAmount
 * in contexts that are always OMR by design (e.g. HQ's own
 * license_fee_omr, a flat fee HQ sets in its home currency).
 */
const CURRENCY_TEXT: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', SAR: 'SAR', AED: 'AED', KWD: 'KWD', QAR: 'QAR', BHD: 'BHD',
}

export default function CurrencyAmount({
  value,
  currency,
  light = false,
  decimals = 3,
  className,
}: {
  value: number
  currency: string
  light?: boolean
  decimals?: number
  className?: string
}) {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  if (!currency || currency === 'OMR') {
    return (
      <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={light ? '/currency/omr_light.png' : '/currency/omr_dark.png'}
          alt="OMR"
          style={{ height: '0.72em', width: 'auto' }}
        />
        <span>{formatted}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <span>{formatted}</span>
      <span className="text-[0.85em] font-semibold opacity-80">{CURRENCY_TEXT[currency] ?? currency}</span>
    </span>
  )
}

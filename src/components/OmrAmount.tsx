/**
 * OmrAmount — renders a monetary amount with the official OMR currency symbol image.
 * Use this in place of plain `{fmtAmt(n, currency)}` in JSX.
 *
 * For non-JSX contexts (Excel exports, PDF strings, email text) keep using fmtAmt().
 *
 * Props:
 *   value   — the numeric amount
 *   light   — true = white symbol (for dark/navy backgrounds), default = black symbol
 *   className — additional classes on the wrapper span
 */
export default function OmrAmount({
  value,
  light = false,
  className,
}: {
  value: number
  light?: boolean
  className?: string
}) {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })

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

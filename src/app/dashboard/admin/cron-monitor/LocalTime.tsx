'use client'

/**
 * Renders an ISO timestamp in the visitor's local timezone.
 * The cron monitor page is a server component that runs in UTC — without this
 * client wrapper the times would always display as UTC.
 */
export default function LocalTime({ iso }: { iso: string }) {
  const d = new Date(iso)
  return (
    <>{d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })}</>
  )
}

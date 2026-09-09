import FeatureFlagsCard from '../../settings/FeatureFlagsCard'

export const metadata = { title: 'Feature Flags' }

export default function OwnerFeatureFlagsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Feature Flags</h1>
        <p className="text-sm text-slate-500 mt-0.5">Turn features on or off for your tenants</p>
      </div>
      <FeatureFlagsCard />
    </div>
  )
}

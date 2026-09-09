import SuperAdminFeatureFlagsCard from '../../settings/SuperAdminFeatureFlagsCard'

export const metadata = { title: 'Feature Flags' }

export default function SuperAdminFeatureFlagsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Feature Flags</h1>
        <p className="text-sm text-slate-500 mt-0.5">Toggle features for your branch, or override per organization</p>
      </div>
      <SuperAdminFeatureFlagsCard />
    </div>
  )
}

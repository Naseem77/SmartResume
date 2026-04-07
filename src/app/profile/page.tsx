import ProfileForm from '@/components/ProfileForm'

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Step 1 of 2
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Your base resume info. Fill this in once — we do the rest for each job.</p>
        </div>
        <ProfileForm />
      </div>
    </main>
  )
}

import ProfileForm from '@/components/ProfileForm'

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Your base resume information. Used to generate tailored resumes for each job.</p>
        </div>
        <ProfileForm />
      </div>
    </main>
  )
}

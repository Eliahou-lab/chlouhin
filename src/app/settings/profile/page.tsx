import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { ProfileForm } from "./profile-form"

export default async function SettingsProfilePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const { data: chaliah } = await supabase
    .from("chaliah")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Modifier mon profil
        </h1>
        <ProfileForm 
          userId={user.id} 
          profile={profile} 
          chaliah={chaliah}
        />
      </div>
    </div>
  )
}

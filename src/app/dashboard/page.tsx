import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground mb-8">
          Bienvenue, {profile?.full_name || user.email}!
        </p>
        <div className="card p-8 border rounded-lg">
          <p className="text-muted-foreground">
            Page privée du tableau de bord - Contenu à venir
          </p>
        </div>
      </div>
    </div>
  )
}

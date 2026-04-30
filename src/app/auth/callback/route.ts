import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if profile is complete
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", data.user.id)
        .single()

      const isProfileComplete = profile?.full_name && profile?.bio

      const redirectUrl = isProfileComplete ? "/dashboard" : "/settings/profile"
      return NextResponse.redirect(`${origin}${redirectUrl}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

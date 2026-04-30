import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { ChaliahProfile } from "./chaliah-profile"

interface ChaliahPageProps {
  params: Promise<{ slug: string }>
}

export default async function ChaliahPage({ params }: ChaliahPageProps) {
  const { slug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Get current user (for checking if viewing own profile)
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Get chaliah by slug
  const { data: chaliah } = await supabase
    .from("chaliah")
    .select("*, profiles(*)")
    .eq("slug", slug)
    .single()

  if (!chaliah) {
    notFound()
  }

  // Get claimed Beth Habad
  const { data: bethHabad } = await supabase
    .from("beth_habad_claims")
    .select("*, beth_habad(*)")
    .eq("chaliah_id", chaliah.id)
    .eq("status", "approved")
    .single()

  // Check if current user is following this chaliah
  let isFollowing = false
  if (currentUser) {
    const { data: follow } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", currentUser.id)
      .eq("following_id", chaliah.user_id)
      .single()
    isFollowing = !!follow
  }

  return (
    <ChaliahProfile
      chaliah={chaliah}
      profile={chaliah.profiles}
      bethHabad={bethHabad?.beth_habad}
      currentUser={currentUser}
      isFollowing={isFollowing}
    />
  )
}

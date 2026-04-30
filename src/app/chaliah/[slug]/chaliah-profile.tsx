"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, MessageSquare, UserPlus, UserMinus } from "lucide-react"

interface ChaliahProfileProps {
  chaliah: {
    id: string
    user_id: string
    slug: string
    bio: string | null
    parcours: string | null
  }
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
    bio: string | null
  }
  bethHabad: {
    id: string
    name: string
    address: string | null
    slug: string
  } | null
  currentUser: { id: string } | null
  isFollowing: boolean
}

export function ChaliahProfile({
  chaliah,
  profile,
  bethHabad,
  currentUser,
  isFollowing: initialIsFollowing,
}: ChaliahProfileProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  const isOwnProfile = currentUser?.id === chaliah.user_id

  const handleFollow = async () => {
    if (!currentUser) {
      router.push("/login")
      return
    }

    setLoading(true)

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", chaliah.user_id)
      setIsFollowing(false)
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUser.id,
        following_id: chaliah.user_id,
      })
      setIsFollowing(true)
    }

    setLoading(false)
    router.refresh()
  }

  const handleMessage = () => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    // Redirect to messages page with this user
    router.push(`/messages/${chaliah.user_id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {profile.full_name || "Chaliah"}
                </h1>
                <p className="text-muted-foreground mt-1">@{chaliah.slug}</p>
                
                {bethHabad && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <Link 
                      href={`/beth-habad/${bethHabad.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {bethHabad.name}
                    </Link>
                  </div>
                )}
              </div>

              {!isOwnProfile && (
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollow}
                    disabled={loading}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="mr-2 h-4 w-4" />
                        Ne plus suivre
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Suivre
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleMessage}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                </div>
              )}

              {isOwnProfile && (
                <Link href="/settings/profile">
                  <Button variant="outline">Modifier le profil</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bio Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Bio personnelle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {profile.bio || "Aucune bio personnelle"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bio Chaliah</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {chaliah.bio || "Aucune bio Chaliah"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Parcours Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Parcours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {chaliah.parcours || "Aucun parcours renseigné"}
            </p>
          </CardContent>
        </Card>

        {/* Beth Habad Section */}
        {bethHabad && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Beth Habad associé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{bethHabad.name}</h3>
                  {bethHabad.address && (
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {bethHabad.address}
                    </p>
                  )}
                  <Link href={`/beth-habad/${bethHabad.slug}`}>
                    <Button variant="outline" size="sm" className="mt-4">
                      Voir le Beth Habad
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

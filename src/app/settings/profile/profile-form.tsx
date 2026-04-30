"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileFormProps {
  userId: string
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
    bio: string | null
  } | null
  chaliah: {
    id: string
    slug: string
    bio: string | null
    parcours: string | null
  } | null
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
}

export function ProfileForm({ userId, profile, chaliah }: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [parcours, setParcours] = useState(chaliah?.parcours || "")
  const [chaliahBio, setChaliahBio] = useState(chaliah?.bio || "")
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, file)

    if (uploadError) {
      setMessage(`Erreur upload: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath)

    setAvatarUrl(publicUrl)
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const slug = generateSlug(fullName)

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        bio,
        avatar_url: avatarUrl,
      })

    if (profileError) {
      setMessage(`Erreur profil: ${profileError.message}`)
      setSaving(false)
      return
    }

    // Upsert chaliah
    const { error: chaliahError } = await supabase
      .from("chaliah")
      .upsert({
        id: chaliah?.id,
        user_id: userId,
        slug,
        bio: chaliahBio,
        parcours,
      })

    if (chaliahError) {
      setMessage(`Erreur chaliah: ${chaliahError.message}`)
      setSaving(false)
      return
    }

    setMessage("Profil mis à jour avec succès!")
    router.refresh()
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du profil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className={`p-3 rounded ${message.includes("Erreur") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {message}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>{fullName?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Upload..." : "Changer la photo"}
              </Button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom complet"
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio personnelle</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez de vous..."
              rows={3}
            />
          </div>

          {/* Chaliah Bio */}
          <div className="space-y-2">
            <Label htmlFor="chaliahBio">Bio Chaliah</Label>
            <Textarea
              id="chaliahBio"
              value={chaliahBio}
              onChange={(e) => setChaliahBio(e.target.value)}
              placeholder="Votre rôle en tant que Chaliah..."
              rows={3}
            />
          </div>

          {/* Parcours */}
          <div className="space-y-2">
            <Label htmlFor="parcours">Parcours</Label>
            <Textarea
              id="parcours"
              value={parcours}
              onChange={(e) => setParcours(e.target.value)}
              placeholder="Votre parcours, formation, expérience..."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

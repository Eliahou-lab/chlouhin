#!/usr/bin/env tsx
/**
 * Script pour scraper les Beth Habad depuis l'API officielle Chabad.org
 * et les insérer dans Supabase
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), ".env.local")
try {
  const envConfig = readFileSync(envPath, "utf8")
  const envVars = envConfig.split("\n").reduce((acc, line) => {
    const [key, value] = line.split("=")
    if (key && value) {
      acc[key.trim()] = value.trim()
    }
    return acc
  }, {} as Record<string, string>)

  Object.assign(process.env, envVars)
} catch {
  console.log("Using existing environment variables")
}

interface BethHabadData {
  name: string
  address: string
  country: string
  city: string
  phone: string | null
  website: string | null
  lat: number | null
  lng: number | null
  slug: string
}

interface ChabadCenterApiResponse {
  data: {
    relationships: {
      centers: {
        data: Array<{ id: string; type: string }>
      }
    }
  }
  included: Array<{
    id: string
    type: string
    attributes: {
      name?: string
      city?: string
      "static-url"?: string
      coordinates?: {
        latitude: number
        longitude: number
      }
      address?: {
        "address-line1"?: string | null
        "address-line2"?: string | null
        city?: string
        state?: string
        country?: string
        "zip-code"?: string
      }
      phone?: string
      website?: string
    }
  }>
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^\w\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .substring(0, 50)
}

function buildFullAddress(addressObj: ChabadCenterApiResponse["included"][0]["attributes"]["address"]): string {
  if (!addressObj) return ""

  const parts: string[] = []

  if (addressObj["address-line1"]) parts.push(addressObj["address-line1"])
  if (addressObj["address-line2"]) parts.push(addressObj["address-line2"])
  if (addressObj.city) parts.push(addressObj.city)
  if (addressObj.state) parts.push(addressObj.state)
  if (addressObj.country) parts.push(addressObj.country)
  if (addressObj["zip-code"]) parts.push(addressObj["zip-code"])

  return parts.join(", ")
}

async function fetchCentersPage(query: string, offset: number, limit: number): Promise<ChabadCenterApiResponse | null> {
  const url = `https://www.chabad.org/api/v2/chabadorg/centers/search?limit=${limit}&offset=${offset}&query=${query}&type=&format=jsonapi&lang=en`

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Chlouhin/1.0)"
      }
    })

    if (!response.ok) {
      console.error(`HTTP error ${response.status} for offset ${offset}`)
      return null
    }

    return await response.json() as ChabadCenterApiResponse
  } catch (error) {
    console.error(`Error fetching offset ${offset}:`, error)
    return null
  }
}

async function fetchCentersForLetter(letter: string): Promise<BethHabadData[]> {
  const centers: BethHabadData[] = []
  const limit = 100
  let offset = 0
  let hasMore = true

  console.log(`  � Letter "${letter}" - fetching...`)

  while (hasMore) {
    const data = await fetchCentersPage(letter, offset, limit)
    await new Promise(r => setTimeout(r, 500))

    if (!data?.included || data.included.length === 0) {
      hasMore = false
      continue
    }

    for (const center of data.included) {
      if (center.type !== "center") continue

      const attrs = center.attributes
      if (!attrs.name) continue

      const addressObj = attrs.address
      const fullAddress = buildFullAddress(addressObj)
      const country = addressObj?.country || "Unknown"
      const city = attrs.city || addressObj?.city || "Unknown"

      centers.push({
        name: attrs.name.trim(),
        address: fullAddress,
        country,
        city,
        phone: attrs.phone || null,
        website: attrs.website || null,
        lat: attrs.coordinates?.latitude ?? null,
        lng: attrs.coordinates?.longitude ?? null,
        slug: generateSlug(attrs.name)
      })
    }

    if (data.included.length < limit) {
      hasMore = false
    } else {
      offset += limit
    }
  }

  console.log(`  ✅ Letter "${letter}" - ${centers.length} centers`)
  return centers
}

async function fetchAllChabadCenters(): Promise<BethHabadData[]> {
  const allCenters = new Map<string, BethHabadData>()
  const letters = "abcdefghijklmnopqrstuvwxyz"

  console.log("🔍 Fetching all Chabad centers from API...")
  console.log(`   Iterating through ${letters.length} letters with pagination\n`)

  for (const letter of letters) {
    const letterCenters = await fetchCentersForLetter(letter)

    for (const center of letterCenters) {
      const key = center.slug
      if (!allCenters.has(key)) {
        allCenters.set(key, center)
      }
    }

    // Small delay between letters
    if (letter !== "z") {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  const centers = Array.from(allCenters.values())
  console.log(`\n📊 Total unique centers fetched: ${centers.length}`)
  return centers
}

async function insertIntoSupabase(
  supabase: SupabaseClient,
  centers: BethHabadData[]
): Promise<{ inserted: number; skipped: number; errors: number }> {
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const center of centers) {
    // Check if center already exists by slug or name
    const { data: existing } = await supabase
      .from("beth_habad")
      .select("id")
      .or(`slug.eq.${center.slug},name.ilike.${center.name.replaceAll("'", "''")}`)
      .single()

    if (existing) {
      console.log(`⏭️  Skipping duplicate: ${center.name}`)
      skipped++
      continue
    }

    const { error } = await supabase.from("beth_habad").insert({
      slug: center.slug,
      name: center.name,
      address: center.address,
      country: center.country,
      city: center.city,
      phone: center.phone,
      website: center.website,
      lat: center.lat,
      lng: center.lng,
    })

    if (error) {
      console.error(`❌ Error inserting ${center.name}:`, error.message)
      errors++
    } else {
      console.log(`✅ Inserted: ${center.name}`)
      inserted++
    }
  }

  return { inserted, skipped, errors }
}

async function main() {
  console.log("🚀 Starting Chabad.org API scraper...\n")

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                     process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    console.error("   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Fetch all centers with pagination
    const centers = await fetchAllChabadCenters()

    if (centers.length === 0) {
      console.log("⚠️ No centers found")
      process.exit(0)
    }

    // Save to JSON file for reference
    const fs = await import("node:fs/promises")
    await fs.writeFile(
      "scripts/chabad-centers.json",
      JSON.stringify(centers, null, 2)
    )
    console.log(`💾 Saved data to scripts/chabad-centers.json\n`)

    // Insert into Supabase
    console.log("📥 Inserting into Supabase...")
    const { inserted, skipped, errors } = await insertIntoSupabase(supabase, centers)

    console.log("\n📊 Summary:")
    console.log(`   Total centers found: ${centers.length}`)
    console.log(`   Inserted: ${inserted}`)
    console.log(`   Skipped (duplicates): ${skipped}`)
    console.log(`   Errors: ${errors}`)
    console.log("\n✅ Done!")

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()

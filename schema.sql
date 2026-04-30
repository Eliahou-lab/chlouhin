-- ChlouhIN Database Schema
-- PostgreSQL with Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
ON profiles FOR DELETE USING (auth.uid() = id);

-- ============================================
-- USER ROLES TABLE
-- ============================================
CREATE TYPE user_role AS ENUM ('visitor', 'chaliah', 'admin');

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'visitor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- RLS Policies for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User roles are viewable by everyone" 
ON user_roles FOR SELECT USING (true);

CREATE POLICY "Only admins can manage user roles" 
ON user_roles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- BETH HABAD TABLE
-- ============================================
CREATE TABLE beth_habad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for beth_habad
ALTER TABLE beth_habad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beth Habad are viewable by everyone" 
ON beth_habad FOR SELECT USING (true);

CREATE POLICY "Only chaliah and admins can create Beth Habad" 
ON beth_habad FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('chaliah', 'admin')
    )
);

CREATE POLICY "Only chaliah and admins can update Beth Habad" 
ON beth_habad FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('chaliah', 'admin')
    )
);

CREATE POLICY "Only admins can delete Beth Habad" 
ON beth_habad FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- CHALIAH TABLE
-- ============================================
CREATE TABLE chaliah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS Policies for chaliah
ALTER TABLE chaliah ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chaliah profiles are viewable by everyone" 
ON chaliah FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create their chaliah profile" 
ON chaliah FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chaliah can update their own profile" 
ON chaliah FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Chaliah can delete their own profile" 
ON chaliah FOR DELETE USING (auth.uid() = user_id);

parcours text,
-- ============================================
-- BETH HABAD CLAIMS TABLE
-- ============================================
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE beth_habad_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chaliah_id UUID NOT NULL REFERENCES chaliah(id) ON DELETE CASCADE,
    beth_habad_id UUID NOT NULL REFERENCES beth_habad(id) ON DELETE CASCADE,
    status claim_status NOT NULL DEFAULT 'pending',
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chaliah_id, beth_habad_id)
);

-- RLS Policies for beth_habad_claims
ALTER TABLE beth_habad_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claims are viewable by claimants and admins" 
ON beth_habad_claims FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM chaliah WHERE id = chaliah_id
    ) OR
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Chaliah can create claims" 
ON beth_habad_claims FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM chaliah WHERE id = chaliah_id
    )
);

CREATE POLICY "Only admins can update claim status" 
ON beth_habad_claims FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Claimants can delete their pending claims" 
ON beth_habad_claims FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id FROM chaliah WHERE id = chaliah_id
    ) AND status = 'pending'
);

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- RLS Policies for follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone" 
ON follows FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow" 
ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON follows FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" 
ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" 
ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts" 
ON posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts" 
ON posts FOR DELETE USING (auth.uid() = author_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CHECK (sender_id != receiver_id)
);

-- RLS Policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received" 
ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Authenticated users can send messages" 
ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete messages they sent" 
ON messages FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beth_habad_id UUID NOT NULL REFERENCES beth_habad(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date_utc TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone" 
ON events FOR SELECT USING (true);

CREATE POLICY "Chaliah and admins can create events" 
ON events FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('chaliah', 'admin')
    )
);

CREATE POLICY "Chaliah and admins can update events" 
ON events FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('chaliah', 'admin')
    )
);

CREATE POLICY "Chaliah and admins can delete events" 
ON events FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('chaliah', 'admin')
    )
);

-- ============================================
-- RSVPS TABLE
-- ============================================
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- RLS Policies for rsvps
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RSVPs are viewable by event organizers and admins" 
ON rsvps FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM events e
        JOIN beth_habad_claims bc ON e.beth_habad_id = bc.beth_habad_id
        WHERE e.id = event_id AND bc.status = 'approved'
        AND bc.chaliah_id IN (SELECT id FROM chaliah WHERE user_id = auth.uid())
    ) OR
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Authenticated users can RSVP" 
ON rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their RSVP" 
ON rsvps FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles indexes
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Beth Habad indexes
CREATE INDEX idx_beth_habad_slug ON beth_habad(slug);
CREATE INDEX idx_beth_habad_location ON beth_habad(lat, lng);

-- Chaliah indexes
CREATE INDEX idx_chaliah_slug ON chaliah(slug);
CREATE INDEX idx_chaliah_user_id ON chaliah(user_id);

-- Beth Habad claims indexes
CREATE INDEX idx_claims_status ON beth_habad_claims(status);
CREATE INDEX idx_claims_chaliah ON beth_habad_claims(chaliah_id);
CREATE INDEX idx_claims_beth_habad ON beth_habad_claims(beth_habad_id);

-- Follows indexes
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Posts indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Events indexes
CREATE INDEX idx_events_beth_habad ON events(beth_habad_id);
CREATE INDEX idx_events_date ON events(date_utc);

-- RSVPs indexes
CREATE INDEX idx_rsvps_event ON rsvps(event_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beth_habad_updated_at 
    BEFORE UPDATE ON beth_habad 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chaliah_updated_at 
    BEFORE UPDATE ON chaliah 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beth_habad_claims_updated_at 
    BEFORE UPDATE ON beth_habad_claims 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTH TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    ''
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visitor');
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================
-- Create the profiles bucket (run this in Supabase SQL editor or dashboard)
-- Note: Storage buckets are typically created via Supabase Dashboard or API
-- This is for reference:

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('profiles', 'profiles', true);

-- Storage RLS Policies for avatars:
-- CREATE POLICY "Avatar images are publicly accessible"
-- ON storage.objects FOR SELECT USING (bucket_id = 'profiles');

-- CREATE POLICY "Users can upload their own avatar"
-- ON storage.objects FOR INSERT 
-- WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update their own avatar"
-- ON storage.objects FOR UPDATE 
-- USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own avatar"
-- ON storage.objects FOR DELETE 
-- USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================
-- Add a default admin role (you'll need to manually assign this to a user)
-- INSERT INTO user_roles (user_id, role) VALUES ('your-user-uuid', 'admin');

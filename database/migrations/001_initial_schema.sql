-- =====================================================
-- MirageCodex Database Schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Reference Tables
-- =====================================================

CREATE TABLE languages (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE model_domains (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  domain_code TEXT NOT NULL REFERENCES model_domains(code),
  context_len INTEGER NOT NULL,
  prompt_cost NUMERIC(10,4) NOT NULL,
  completion_cost NUMERIC(10,4) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, domain_code)
);

-- =====================================================
-- Tag Taxonomy
-- =====================================================

CREATE TABLE tag_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  prompt_boost TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id INTEGER NOT NULL REFERENCES tag_categories(id),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  prompt_boost TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE genre_tags (
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (genre_id, tag_id)
);

-- =====================================================
-- User Management
-- =====================================================

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-insert profile on new user
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles(user_id) VALUES (NEW.id);
  RETURN NEW;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- User API keys (service-role only access)
CREATE TABLE user_api_keys (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_code TEXT NOT NULL REFERENCES model_domains(code),
  api_key_enc TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, domain_code)
);

-- =====================================================
-- Search & Content
-- =====================================================

CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hash TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  language_id INTEGER NOT NULL REFERENCES languages(id),
  genre_id UUID NOT NULL REFERENCES genres(id),
  model_id INTEGER NOT NULL REFERENCES models(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE search_params (
  search_id UUID PRIMARY KEY REFERENCES searches(id) ON DELETE CASCADE,
  free_text TEXT,
  tag_ids UUID[] DEFAULT '{}',
  extra_json JSONB
);

CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pen_name TEXT UNIQUE NOT NULL,
  style_prompt TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  page_count INTEGER NOT NULL CHECK (page_count > 0),
  cover_url TEXT,
  author_id UUID NOT NULL REFERENCES authors(id),
  primary_language_id INTEGER NOT NULL REFERENCES languages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE search_books (
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  page_number INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (search_id, page_number, rank)
);

-- =====================================================
-- Book Content
-- =====================================================

CREATE TABLE editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  model_id INTEGER NOT NULL REFERENCES models(id),
  language_id INTEGER NOT NULL REFERENCES languages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_id, model_id, language_id)
);

CREATE TABLE book_pages (
  id BIGSERIAL PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (edition_id, page_number)
);

-- =====================================================
-- User Interactions
-- =====================================================

CREATE TABLE bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, edition_id, page_number)
);

-- =====================================================
-- Billing
-- =====================================================

CREATE TABLE user_billing (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 0 CHECK (credits >= 0),
  last_event JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_searches_hash ON searches(hash);
CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_created_at ON searches(created_at DESC);
CREATE INDEX idx_books_author_id ON books(author_id);
CREATE INDEX idx_books_language_id ON books(primary_language_id);
CREATE INDEX idx_book_pages_edition_id ON book_pages(edition_id);
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_search_books_search_id ON search_books(search_id);
CREATE INDEX idx_search_books_book_id ON search_books(book_id);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- User API Keys: service role only
CREATE POLICY "Service role can manage user API keys" ON user_api_keys
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Searches: users can read all, write their own
CREATE POLICY "Anyone can view searches" ON searches
  FOR SELECT USING (true);

CREATE POLICY "Users can create searches" ON searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search params: follow searches policy
CREATE POLICY "Anyone can view search params" ON search_params
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM searches 
      WHERE searches.id = search_params.search_id
    )
  );

CREATE POLICY "Users can create search params" ON search_params
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches 
      WHERE searches.id = search_params.search_id 
      AND searches.user_id = auth.uid()
    )
  );

-- Bookmarks: users can manage their own
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- User billing: users can read own, service role can manage
CREATE POLICY "Users can view own billing" ON user_billing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage billing" ON user_billing
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Public read access for content tables
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to reference and content tables
CREATE POLICY "Public read access" ON languages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON model_domains FOR SELECT USING (true);
CREATE POLICY "Public read access" ON models FOR SELECT USING (true);
CREATE POLICY "Public read access" ON tag_categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON genres FOR SELECT USING (true);
CREATE POLICY "Public read access" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON genre_tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON authors FOR SELECT USING (true);
CREATE POLICY "Public read access" ON books FOR SELECT USING (true);
CREATE POLICY "Public read access" ON search_books FOR SELECT USING (true);
CREATE POLICY "Public read access" ON editions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON book_pages FOR SELECT USING (true);

-- Service role can insert content
CREATE POLICY "Service role can manage content" ON authors
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage content" ON books
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage content" ON search_books
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage content" ON editions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage content" ON book_pages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Seed Data
-- =====================================================

-- Languages
INSERT INTO languages (code, label) VALUES
  ('en', 'English'),
  ('el', 'Greek'),
  ('es', 'Spanish'),
  ('fr', 'French');

-- Model domains
INSERT INTO model_domains (code, label) VALUES
  ('openai', 'OpenAI'),
  ('anthropic', 'Anthropic'),
  ('google', 'Google'),
  ('local', 'Local');

-- Models
INSERT INTO models (name, domain_code, context_len, prompt_cost, completion_cost) VALUES
  ('gpt-4o', 'openai', 128000, 0.0250, 0.1000),
  ('gpt-4', 'openai', 8192, 0.0300, 0.0600),
  ('gemini-1.5-pro', 'google', 1000000, 0.0035, 0.0105),
  ('gemini-1.5-flash', 'google', 1000000, 0.0007, 0.0021);

-- Tag categories
INSERT INTO tag_categories (slug, label, order_index) VALUES
  ('tone', 'Tone & Mood', 1),
  ('style', 'Writing Style', 2),
  ('themes', 'Themes', 3),
  ('setting', 'Setting', 4),
  ('elements', 'Story Elements', 5),
  ('audience', 'Target Audience', 6);

-- Genres
INSERT INTO genres (slug, label, prompt_boost, order_index) VALUES
  ('fantasy', 'Fantasy', 'Create fantasy literature with magic, mythical creatures, and otherworldly realms. Focus on rich world-building, heroic journeys, and the struggle between good and evil.', 1),
  ('sci-fi', 'Science Fiction', 'Generate science fiction that explores future technologies, space exploration, AI, and the impact of scientific advancement on humanity.', 2),
  ('mystery', 'Mystery', 'Craft mystery and detective stories with puzzles to solve, clues to follow, and surprising revelations. Include red herrings and logical deduction.', 3),
  ('romance', 'Romance', 'Write romantic literature focusing on relationships, emotional connections, and the journey of love. Include both sweet and passionate elements.', 4),
  ('horror', 'Horror', 'Create horror fiction designed to frighten, unsettle, and create suspense. Include supernatural or psychological elements that evoke fear.', 5),
  ('literary', 'Literary Fiction', 'Generate sophisticated literary fiction that explores human nature, complex characters, and profound themes with elegant prose.', 6),
  ('thriller', 'Thriller', 'Write fast-paced thrillers with high stakes, constant tension, and edge-of-your-seat suspense. Include plot twists and danger.', 7),
  ('historical', 'Historical Fiction', 'Create historical fiction set in the past, with careful attention to period details, customs, and the social context of the era.', 8);

-- Tags
INSERT INTO tags (category_id, slug, label, prompt_boost) VALUES
  -- Tone & Mood
  (1, 'dark', 'Dark', 'Incorporate dark themes, moral ambiguity, and shadowy atmospheres'),
  (1, 'whimsical', 'Whimsical', 'Add playful, quirky, and lighthearted elements with gentle humor'),
  (1, 'melancholic', 'Melancholic', 'Include wistful, bittersweet, and contemplative moods'),
  (1, 'uplifting', 'Uplifting', 'Create inspiring, hopeful, and positive emotional journeys'),
  
  -- Writing Style
  (2, 'lyrical', 'Lyrical', 'Use poetic, flowing prose with beautiful imagery and rhythm'),
  (2, 'minimalist', 'Minimalist', 'Employ spare, concise writing with economy of language'),
  (2, 'experimental', 'Experimental', 'Use unconventional narrative structures and innovative techniques'),
  (2, 'epistolary', 'Epistolary', 'Structure as letters, diary entries, or documents'),
  
  -- Themes
  (3, 'philosophical', 'Philosophical', 'Explore deep questions about existence, morality, and the human condition'),
  (3, 'psychological', 'Psychological', 'Delve into mental states, trauma, and the complexities of the psyche'),
  (3, 'social-commentary', 'Social Commentary', 'Address societal issues, inequality, and cultural critique'),
  (3, 'coming-of-age', 'Coming of Age', 'Focus on personal growth, self-discovery, and maturation'),
  
  -- Setting
  (4, 'urban', 'Urban', 'Set in cities with modern, metropolitan environments'),
  (4, 'rural', 'Rural', 'Place in countryside, small towns, or agricultural settings'),
  (4, 'post-apocalyptic', 'Post-Apocalyptic', 'Set after civilization collapse or catastrophic events'),
  (4, 'alternate-history', 'Alternate History', 'Explore what-if scenarios in different historical timelines'),
  
  -- Story Elements
  (5, 'magical-realism', 'Magical Realism', 'Blend magical elements seamlessly into realistic settings'),
  (5, 'time-travel', 'Time Travel', 'Include temporal displacement and its consequences'),
  (5, 'unreliable-narrator', 'Unreliable Narrator', 'Use narrators whose credibility is compromised'),
  (5, 'multiple-perspectives', 'Multiple Perspectives', 'Tell story through various character viewpoints'),
  
  -- Target Audience
  (6, 'young-adult', 'Young Adult', 'Tailor for teenage readers with age-appropriate themes'),
  (6, 'literary-fiction', 'Literary Fiction', 'Aim for sophisticated adult readers seeking artistic merit');

-- Genre-tag relationships (sample associations)
INSERT INTO genre_tags (genre_id, tag_id) VALUES
  -- Fantasy associations
  ((SELECT id FROM genres WHERE slug = 'fantasy'), (SELECT id FROM tags WHERE slug = 'dark')),
  ((SELECT id FROM genres WHERE slug = 'fantasy'), (SELECT id FROM tags WHERE slug = 'whimsical')),
  ((SELECT id FROM genres WHERE slug = 'fantasy'), (SELECT id FROM tags WHERE slug = 'lyrical')),
  ((SELECT id FROM genres WHERE slug = 'fantasy'), (SELECT id FROM tags WHERE slug = 'magical-realism')),
  
  -- Sci-fi associations
  ((SELECT id FROM genres WHERE slug = 'sci-fi'), (SELECT id FROM tags WHERE slug = 'philosophical')),
  ((SELECT id FROM genres WHERE slug = 'sci-fi'), (SELECT id FROM tags WHERE slug = 'post-apocalyptic')),
  ((SELECT id FROM genres WHERE slug = 'sci-fi'), (SELECT id FROM tags WHERE slug = 'time-travel')),
  ((SELECT id FROM genres WHERE slug = 'sci-fi'), (SELECT id FROM tags WHERE slug = 'social-commentary')),
  
  -- Literary fiction associations
  ((SELECT id FROM genres WHERE slug = 'literary'), (SELECT id FROM tags WHERE slug = 'philosophical')),
  ((SELECT id FROM genres WHERE slug = 'literary'), (SELECT id FROM tags WHERE slug = 'psychological')),
  ((SELECT id FROM genres WHERE slug = 'literary'), (SELECT id FROM tags WHERE slug = 'experimental')),
  ((SELECT id FROM genres WHERE slug = 'literary'), (SELECT id FROM tags WHERE slug = 'unreliable-narrator'));

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_billing_updated_at 
  BEFORE UPDATE ON user_billing 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
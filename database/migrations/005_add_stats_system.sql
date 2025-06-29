-- ============================================================================
-- MIRAGE CODEX: STATS SYSTEM MIGRATION
-- ============================================================================
-- This migration adds a comprehensive stats system for tracking likes and views
-- on books and book pages with real-time counter updates via triggers.
--
-- Features:
-- • Like/reaction tracking for books and pages
-- • View event tracking for books and pages  
-- • Aggregated stats tables with auto-updating counters
-- • High-performance indexes for popularity sorting
-- • Row-Level Security for public read, service write
-- • Backfill support for existing data
-- ============================================================================

-- ============================================================================
-- 1. REACTION TABLES (for likes)
-- ============================================================================

-- Book reactions (likes)
CREATE TABLE IF NOT EXISTS book_reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one reaction per user per book
    UNIQUE(user_id, book_id)
);

-- Page reactions (likes)
CREATE TABLE IF NOT EXISTS page_reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id BIGINT NOT NULL REFERENCES book_pages(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one reaction per user per page
    UNIQUE(user_id, page_id)
);

-- ============================================================================
-- 2. VIEW EVENT TABLES (for tracking views)
-- ============================================================================

-- Book view events
CREATE TABLE IF NOT EXISTS book_view_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous views
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    session_id TEXT, -- For anonymous tracking
    ip_address INET, -- For rate limiting/analytics
    user_agent TEXT, -- For analytics
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Page view events  
CREATE TABLE IF NOT EXISTS page_view_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous views
    page_id BIGINT NOT NULL REFERENCES book_pages(id) ON DELETE CASCADE,
    session_id TEXT, -- For anonymous tracking
    ip_address INET, -- For rate limiting/analytics
    user_agent TEXT, -- For analytics
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. STATS TABLES (aggregated counters)
-- ============================================================================

-- Book stats with aggregated counters
CREATE TABLE IF NOT EXISTS book_stats (
    book_id UUID PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
    likes_cnt BIGINT NOT NULL DEFAULT 0,
    views_cnt BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Page stats with aggregated counters
CREATE TABLE IF NOT EXISTS page_stats (
    page_id BIGINT PRIMARY KEY REFERENCES book_pages(id) ON DELETE CASCADE,
    likes_cnt BIGINT NOT NULL DEFAULT 0,
    views_cnt BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. TRIGGER FUNCTIONS (for automatic counter updates)
-- ============================================================================

-- Function to sync book like totals
CREATE OR REPLACE FUNCTION sync_like_totals_book()
RETURNS TRIGGER
SECURITY DEFINER -- Bypass RLS
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment likes count
        INSERT INTO book_stats (book_id, likes_cnt, updated_at)
        VALUES (NEW.book_id, 1, NOW())
        ON CONFLICT (book_id) 
        DO UPDATE SET 
            likes_cnt = book_stats.likes_cnt + 1,
            updated_at = NOW();
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement likes count (ensure it doesn't go below 0)
        UPDATE book_stats 
        SET 
            likes_cnt = GREATEST(likes_cnt - 1, 0),
            updated_at = NOW()
        WHERE book_id = OLD.book_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Function to sync page like totals
CREATE OR REPLACE FUNCTION sync_like_totals_page()
RETURNS TRIGGER
SECURITY DEFINER -- Bypass RLS
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment likes count
        INSERT INTO page_stats (page_id, likes_cnt, updated_at)
        VALUES (NEW.page_id, 1, NOW())
        ON CONFLICT (page_id) 
        DO UPDATE SET 
            likes_cnt = page_stats.likes_cnt + 1,
            updated_at = NOW();
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement likes count (ensure it doesn't go below 0)
        UPDATE page_stats 
        SET 
            likes_cnt = GREATEST(likes_cnt - 1, 0),
            updated_at = NOW()
        WHERE page_id = OLD.page_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Function to sync book view totals
CREATE OR REPLACE FUNCTION sync_view_totals_book()
RETURNS TRIGGER
SECURITY DEFINER -- Bypass RLS
LANGUAGE plpgsql AS $$
BEGIN
    -- Only handle INSERT (views never decrement)
    INSERT INTO book_stats (book_id, views_cnt, updated_at)
    VALUES (NEW.book_id, 1, NOW())
    ON CONFLICT (book_id) 
    DO UPDATE SET 
        views_cnt = book_stats.views_cnt + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Function to sync page view totals
CREATE OR REPLACE FUNCTION sync_view_totals_page()
RETURNS TRIGGER
SECURITY DEFINER -- Bypass RLS
LANGUAGE plpgsql AS $$
BEGIN
    -- Only handle INSERT (views never decrement)
    INSERT INTO page_stats (page_id, views_cnt, updated_at)
    VALUES (NEW.page_id, 1, NOW())
    ON CONFLICT (page_id) 
    DO UPDATE SET 
        views_cnt = page_stats.views_cnt + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Function to initialize stats rows for new books
CREATE OR REPLACE FUNCTION init_book_stats()
RETURNS TRIGGER
SECURITY DEFINER -- Bypass RLS
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO book_stats (book_id, likes_cnt, views_cnt, updated_at)
    VALUES (NEW.id, 0, 0, NOW())
    ON CONFLICT (book_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Function to initialize stats rows for new pages
CREATE OR REPLACE FUNCTION init_page_stats()
RETURNS TRIGGER
SECURITY DEFINER -- Bypass RLS
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO page_stats (page_id, likes_cnt, views_cnt, updated_at)
    VALUES (NEW.id, 0, 0, NOW())
    ON CONFLICT (page_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS (automatic function execution)
-- ============================================================================

-- Book like triggers
DROP TRIGGER IF EXISTS trigger_sync_book_likes ON book_reactions;
CREATE TRIGGER trigger_sync_book_likes
    AFTER INSERT OR DELETE ON book_reactions
    FOR EACH ROW
    EXECUTE FUNCTION sync_like_totals_book();

-- Page like triggers
DROP TRIGGER IF EXISTS trigger_sync_page_likes ON page_reactions;
CREATE TRIGGER trigger_sync_page_likes
    AFTER INSERT OR DELETE ON page_reactions
    FOR EACH ROW
    EXECUTE FUNCTION sync_like_totals_page();

-- Book view triggers
DROP TRIGGER IF EXISTS trigger_sync_book_views ON book_view_events;
CREATE TRIGGER trigger_sync_book_views
    AFTER INSERT ON book_view_events
    FOR EACH ROW
    EXECUTE FUNCTION sync_view_totals_book();

-- Page view triggers
DROP TRIGGER IF EXISTS trigger_sync_page_views ON page_view_events;
CREATE TRIGGER trigger_sync_page_views
    AFTER INSERT ON page_view_events
    FOR EACH ROW
    EXECUTE FUNCTION sync_view_totals_page();

-- Stats initialization triggers
DROP TRIGGER IF EXISTS trigger_init_book_stats ON books;
CREATE TRIGGER trigger_init_book_stats
    AFTER INSERT ON books
    FOR EACH ROW
    EXECUTE FUNCTION init_book_stats();

DROP TRIGGER IF EXISTS trigger_init_page_stats ON book_pages;
CREATE TRIGGER trigger_init_page_stats
    AFTER INSERT ON book_pages
    FOR EACH ROW
    EXECUTE FUNCTION init_page_stats();

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

-- Reaction table indexes
CREATE INDEX IF NOT EXISTS idx_book_reactions_book_id ON book_reactions(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reactions_user_id ON book_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_page_reactions_page_id ON page_reactions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_reactions_user_id ON page_reactions(user_id);

-- View event indexes
CREATE INDEX IF NOT EXISTS idx_book_views_book_id ON book_view_events(book_id);
CREATE INDEX IF NOT EXISTS idx_book_views_user_id ON book_view_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_book_views_created_at ON book_view_events(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_view_events(page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_view_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_view_events(created_at);

-- Stats popularity indexes for sorting
CREATE INDEX IF NOT EXISTS idx_book_stats_popularity ON book_stats(likes_cnt DESC, views_cnt DESC);
CREATE INDEX IF NOT EXISTS idx_book_stats_likes ON book_stats(likes_cnt DESC);
CREATE INDEX IF NOT EXISTS idx_book_stats_views ON book_stats(views_cnt DESC);
CREATE INDEX IF NOT EXISTS idx_page_stats_popularity ON page_stats(likes_cnt DESC, views_cnt DESC);
CREATE INDEX IF NOT EXISTS idx_page_stats_likes ON page_stats(likes_cnt DESC);
CREATE INDEX IF NOT EXISTS idx_page_stats_views ON page_stats(views_cnt DESC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (public read, service write)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE book_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_stats ENABLE ROW LEVEL SECURITY;

-- Book reactions policies
CREATE POLICY "book_reactions_read" ON book_reactions 
    FOR SELECT USING (true);
CREATE POLICY "book_reactions_insert" ON book_reactions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "book_reactions_delete" ON book_reactions 
    FOR DELETE USING (auth.uid() = user_id);

-- Page reactions policies
CREATE POLICY "page_reactions_read" ON page_reactions 
    FOR SELECT USING (true);
CREATE POLICY "page_reactions_insert" ON page_reactions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "page_reactions_delete" ON page_reactions 
    FOR DELETE USING (auth.uid() = user_id);

-- View events policies (read-only for users, insert for anyone)
CREATE POLICY "book_views_read" ON book_view_events 
    FOR SELECT USING (true);
CREATE POLICY "book_views_insert" ON book_view_events 
    FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "page_views_read" ON page_view_events 
    FOR SELECT USING (true);
CREATE POLICY "page_views_insert" ON page_view_events 
    FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Stats policies (public read, service write only)
CREATE POLICY "book_stats_read" ON book_stats 
    FOR SELECT USING (true);
CREATE POLICY "book_stats_service" ON book_stats 
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "page_stats_read" ON page_stats 
    FOR SELECT USING (true);
CREATE POLICY "page_stats_service" ON page_stats 
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 8. BACKFILL EXISTING DATA
-- ============================================================================

-- Initialize stats rows for all existing books
INSERT INTO book_stats (book_id, likes_cnt, views_cnt, updated_at)
SELECT id, 0, 0, NOW()
FROM books
ON CONFLICT (book_id) DO NOTHING;

-- Initialize stats rows for all existing pages  
INSERT INTO page_stats (page_id, likes_cnt, views_cnt, updated_at)
SELECT id, 0, 0, NOW()
FROM book_pages
ON CONFLICT (page_id) DO NOTHING;

-- ============================================================================
-- 9. UTILITY FUNCTIONS FOR MANUAL RECALCULATION
-- ============================================================================

-- Function to recalculate book like counts (for data recovery)
CREATE OR REPLACE FUNCTION recalculate_book_likes()
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Update all book like counts based on actual reaction data
    UPDATE book_stats 
    SET 
        likes_cnt = COALESCE(reaction_counts.cnt, 0),
        updated_at = NOW()
    FROM (
        SELECT book_id, COUNT(*) as cnt 
        FROM book_reactions 
        WHERE reaction_type = 'like'
        GROUP BY book_id
    ) reaction_counts
    WHERE book_stats.book_id = reaction_counts.book_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Reset counts for books with no reactions
    UPDATE book_stats 
    SET likes_cnt = 0, updated_at = NOW()
    WHERE book_id NOT IN (
        SELECT DISTINCT book_id FROM book_reactions WHERE reaction_type = 'like'
    ) AND likes_cnt > 0;
    
    RETURN affected_rows;
END;
$$;

-- Function to recalculate page like counts (for data recovery)
CREATE OR REPLACE FUNCTION recalculate_page_likes()
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Update all page like counts based on actual reaction data
    UPDATE page_stats 
    SET 
        likes_cnt = COALESCE(reaction_counts.cnt, 0),
        updated_at = NOW()
    FROM (
        SELECT page_id, COUNT(*) as cnt 
        FROM page_reactions 
        WHERE reaction_type = 'like'
        GROUP BY page_id
    ) reaction_counts
    WHERE page_stats.page_id = reaction_counts.page_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Reset counts for pages with no reactions
    UPDATE page_stats 
    SET likes_cnt = 0, updated_at = NOW()
    WHERE page_id NOT IN (
        SELECT DISTINCT page_id FROM page_reactions WHERE reaction_type = 'like'
    ) AND likes_cnt > 0;
    
    RETURN affected_rows;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Stats system migration completed successfully!';
    RAISE NOTICE 'Created tables: book_reactions, page_reactions, book_view_events, page_view_events, book_stats, page_stats';
    RAISE NOTICE 'Created % triggers for automatic counter updates', 6;
    RAISE NOTICE 'Backfilled stats for % books and % pages', 
        (SELECT COUNT(*) FROM books), 
        (SELECT COUNT(*) FROM book_pages);
END $$; 
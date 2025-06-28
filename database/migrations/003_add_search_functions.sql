-- =====================================================
-- Search Functions for Author Selection and Book Saving
-- =====================================================

-- Function to get random authors who have written books in a specific genre
CREATE OR REPLACE FUNCTION get_random_authors_by_genre(
  p_genre_slug TEXT,
  p_limit INTEGER
) 
RETURNS TABLE(
  id UUID,
  pen_name TEXT,
  style_prompt TEXT,
  bio TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    a.id,
    a.pen_name,
    a.style_prompt,
    a.bio
  FROM authors a
  INNER JOIN books b ON a.id = b.author_id
  INNER JOIN search_books sb ON b.id = sb.book_id
  INNER JOIN searches s ON sb.search_id = s.id
  INNER JOIN genres g ON s.genre_id = g.id
  WHERE g.slug = p_genre_slug
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save search results with books and authors
CREATE OR REPLACE FUNCTION save_search_results(
  p_hash TEXT,
  p_user_id UUID,
  p_free_text TEXT,
  p_language_code TEXT,
  p_genre_slug TEXT,
  p_tag_slugs TEXT[],
  p_model_id INTEGER,
  p_page_number INTEGER,
  p_page_size INTEGER,
  p_books JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_search_id UUID;
  v_language_id INTEGER;
  v_genre_id UUID;
  v_tag_ids UUID[];
  v_book JSONB;
  v_book_id UUID;
  v_section JSONB;
  v_rank INTEGER;
BEGIN
  -- Get language ID
  SELECT id INTO v_language_id 
  FROM languages 
  WHERE code = p_language_code;
  
  IF v_language_id IS NULL THEN
    RAISE EXCEPTION 'Language not found: %', p_language_code;
  END IF;

  -- Get genre ID
  SELECT id INTO v_genre_id 
  FROM genres 
  WHERE slug = p_genre_slug;
  
  IF v_genre_id IS NULL THEN
    RAISE EXCEPTION 'Genre not found: %', p_genre_slug;
  END IF;

  -- Get tag IDs
  SELECT ARRAY_AGG(id) INTO v_tag_ids
  FROM tags 
  WHERE slug = ANY(p_tag_slugs);

  -- Create search record
  INSERT INTO searches (hash, user_id, language_id, genre_id, model_id)
  VALUES (p_hash, p_user_id, v_language_id, v_genre_id, p_model_id)
  RETURNING id INTO v_search_id;

  -- Create search params
  INSERT INTO search_params (search_id, free_text, tag_ids)
  VALUES (v_search_id, NULLIF(p_free_text, ''), v_tag_ids);

  -- Process each book
  v_rank := 1;
  FOR v_book IN SELECT * FROM jsonb_array_elements(p_books)
  LOOP
    -- Create book record
    INSERT INTO books (
      title, 
      summary, 
      page_count, 
      author_id, 
      primary_language_id
    )
    VALUES (
      v_book->>'title',
      v_book->>'summary',
      (v_book->>'pageCount')::INTEGER,
      (v_book->>'authorId')::UUID,
      v_language_id
    )
    RETURNING id INTO v_book_id;

    -- Link book to search
    INSERT INTO search_books (search_id, book_id, rank, page_number)
    VALUES (v_search_id, v_book_id, v_rank, p_page_number);

    -- Create book sections
    FOR v_section IN SELECT * FROM jsonb_array_elements(v_book->'sections')
    LOOP
      INSERT INTO book_sections (
        book_id,
        title,
        from_page,
        to_page,
        summary,
        order_index
      )
      VALUES (
        v_book_id,
        v_section->>'title',
        (v_section->>'fromPage')::INTEGER,
        (v_section->>'toPage')::INTEGER,
        v_section->>'summary',
        (SELECT COUNT(*) FROM book_sections WHERE book_id = v_book_id) + 1
      );
    END LOOP;

    v_rank := v_rank + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'search_id', v_search_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search results
CREATE OR REPLACE FUNCTION get_search_results(p_hash TEXT)
RETURNS TABLE(
  book_id UUID,
  book_title TEXT,
  book_summary TEXT,
  book_page_count INTEGER,
  book_cover_url TEXT,
  book_sections JSONB,
  author_id UUID,
  author_pen_name TEXT,
  author_bio TEXT,
  language_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as book_id,
    b.title as book_title,
    b.summary as book_summary,
    b.page_count as book_page_count,
    b.cover_url as book_cover_url,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'title', bs.title,
            'fromPage', bs.from_page,
            'toPage', bs.to_page,
            'summary', bs.summary
          ) ORDER BY bs.order_index
        )
        FROM book_sections bs 
        WHERE bs.book_id = b.id
      ), 
      '[]'::jsonb
    ) as book_sections,
    a.id as author_id,
    a.pen_name as author_pen_name,
    a.bio as author_bio,
    l.code as language_code
  FROM searches s
  INNER JOIN search_books sb ON s.id = sb.search_id
  INNER JOIN books b ON sb.book_id = b.id
  INNER JOIN authors a ON b.author_id = a.id
  INNER JOIN languages l ON b.primary_language_id = l.id
  WHERE s.hash = p_hash
  ORDER BY sb.page_number, sb.rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
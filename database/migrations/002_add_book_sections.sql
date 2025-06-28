-- Create book_sections table
CREATE TABLE book_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  from_page INTEGER NOT NULL CHECK (from_page >= 1),
  to_page INTEGER NOT NULL CHECK (to_page >= from_page),
  summary TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure sections don't overlap for the same book
  CONSTRAINT book_sections_order_unique UNIQUE (book_id, order_index),
  
  -- Ensure page ranges are valid
  CONSTRAINT book_sections_page_range_valid CHECK (to_page >= from_page)
);

-- Create index for efficient querying
CREATE INDEX book_sections_book_id_order_idx ON book_sections(book_id, order_index);

-- Add RLS (Row Level Security)
ALTER TABLE book_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read book sections
CREATE POLICY "Anyone can view book sections" ON book_sections
  FOR SELECT USING (true);

-- Policy: Only authenticated users can insert/update/delete book sections
CREATE POLICY "Authenticated users can modify book sections" ON book_sections
  FOR ALL USING (auth.uid() IS NOT NULL); 
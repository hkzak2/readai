# ReadAI Database PRD (Product Requirements Document)

**Version:** 1.0  
**Date:** 2025-07-23  
**Database:** Supabase (PostgreSQL)

## 1. Overview

This document outlines the database architecture for ReadAI's evolution from a single-user document interaction app to a multi-user platform with authentication, public book sharing, and admin analytics.

## 2. Core Requirements

### User Management
- **Authentication:** Supabase Auth integration
- **User Roles:** Admin and Regular users
- **Privacy:** Data isolation with cascade deletion support
- **Public Sharing:** Community-driven book transcriptions

### Book Management
- **Voice Personas:** Multiple voice versions per book (parent-child relationship)
- **Visibility:** Private, Public, Shared access levels
- **Bookmarking:** Reference-based library (no data duplication)
- **Processing:** On-demand text extraction and audio generation

### Analytics & Cost Tracking
- **Admin Dashboard:** User metrics, book statistics, cost analysis
- **Cost Tracking:** Aggregate costs per page/session 
- **Usage Metrics:** Actual playback time (not total duration generated)

## 3. Database Schema

### 3.1 Core Tables

#### `users` (Managed by Supabase Auth)
```sql
-- Supabase Auth automatically provides:
id (uuid, primary key)
email (text, unique)
created_at (timestamp)
-- Additional profile data in user_profiles
```

#### `user_profiles`
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  display_name text,
  avatar_url text,
  preferences jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### `books`
```sql
CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  
  -- Book metadata
  title text NOT NULL,
  author text,
  description text,
  isbn text,
  language text DEFAULT 'en',
  
  -- Voice and processing
  voice_persona text, -- null for parent books, specific voice for children
  voice_settings jsonb DEFAULT '{}', -- speed, pitch, etc.
  
  -- File storage
  pdf_url text, -- Supabase Storage URL or external URL
  pdf_source text CHECK (pdf_source IN ('upload', 'url')),
  thumbnail_url text,
  total_pages integer,
  
  -- Visibility and sharing
  visibility text NOT NULL DEFAULT 'private' 
    CHECK (visibility IN ('private', 'public', 'shared_with_users')),
  shared_with uuid[] DEFAULT '{}', -- array of user IDs for 'shared_with_users'
  
  -- Processing status
  processing_status text DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_parent_book_id ON books(parent_book_id);
CREATE INDEX idx_books_visibility ON books(visibility);
CREATE INDEX idx_books_processing_status ON books(processing_status);
```

#### `user_books` (User Library - Bookmarks)
```sql
CREATE TABLE user_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  
  -- User-specific metadata
  personal_title text, -- User can rename books in their library
  tags text[] DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  last_read_page integer DEFAULT 1,
  reading_progress decimal(5,2) DEFAULT 0.0, -- percentage
  
  -- Reading session data
  total_reading_time_minutes integer DEFAULT 0, -- actual playback time
  last_read_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(user_id, book_id)
);

-- Indexes
CREATE INDEX idx_user_books_user_id ON user_books(user_id);
CREATE INDEX idx_user_books_book_id ON user_books(book_id);
CREATE INDEX idx_user_books_last_read_at ON user_books(last_read_at);
```

### 3.2 Page and Content Tables

#### `pages`
```sql
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  
  -- Page content
  image_url text NOT NULL, -- PDF page as image (Supabase Storage)
  image_width integer,
  image_height integer,
  
  created_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(book_id, page_number)
);

-- Indexes
CREATE INDEX idx_pages_book_id ON pages(book_id);
CREATE INDEX idx_pages_book_page ON pages(book_id, page_number);
```

#### `page_text` (Extracted text content)
```sql
CREATE TABLE page_text (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  
  -- Text extraction
  extracted_text text NOT NULL,
  extraction_confidence decimal(4,3), -- 0.000 to 1.000
  extraction_metadata jsonb DEFAULT '{}', -- AI model info, processing time, etc.
  
  -- Processing info
  processed_at timestamp with time zone DEFAULT now(),
  processing_duration_ms integer,
  
  UNIQUE(page_id)
);

-- Indexes
CREATE INDEX idx_page_text_page_id ON page_text(page_id);
```

#### `page_audio` (Generated audio files)
```sql
CREATE TABLE page_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  
  -- Audio generation
  voice_persona text NOT NULL, -- matches books.voice_persona
  audio_url text NOT NULL, -- Supabase Storage URL
  audio_duration_seconds integer NOT NULL,
  audio_format text DEFAULT 'wav',
  audio_size_bytes bigint,
  
  -- Generation metadata
  voice_settings jsonb DEFAULT '{}',
  generation_metadata jsonb DEFAULT '{}',
  
  -- Processing info
  processed_at timestamp with time zone DEFAULT now(),
  processing_duration_ms integer,
  
  UNIQUE(page_id, voice_persona)
);

-- Indexes
CREATE INDEX idx_page_audio_page_id ON page_audio(page_id);
CREATE INDEX idx_page_audio_voice ON page_audio(voice_persona);
```

### 3.3 User Activity and Analytics

#### `reading_sessions`
```sql
CREATE TABLE reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  
  -- Session data
  start_page integer NOT NULL,
  end_page integer,
  pages_read integer DEFAULT 0,
  listening_time_minutes integer DEFAULT 0, -- actual playback time
  
  -- Session metadata
  voice_persona text,
  playback_speed decimal(3,2) DEFAULT 1.0,
  session_metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  
  -- Status
  session_status text DEFAULT 'active' 
    CHECK (session_status IN ('active', 'completed', 'abandoned'))
);

-- Indexes
CREATE INDEX idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_book_id ON reading_sessions(book_id);
CREATE INDEX idx_reading_sessions_started_at ON reading_sessions(started_at);
```

#### `processing_costs` (Aggregate cost tracking)
```sql
CREATE TABLE processing_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  
  -- Cost breakdown
  text_extraction_cost decimal(10,6) DEFAULT 0,
  text_to_speech_cost decimal(10,6) DEFAULT 0,
  conversation_cost decimal(10,6) DEFAULT 0, -- for future AI chat features
  total_cost decimal(10,6) GENERATED ALWAYS AS (
    text_extraction_cost + text_to_speech_cost + conversation_cost
  ) STORED,
  
  -- Usage metrics
  tokens_used_text integer DEFAULT 0,
  tokens_used_audio integer DEFAULT 0,
  tokens_used_conversation integer DEFAULT 0,
  
  -- Processing metadata
  cost_breakdown jsonb DEFAULT '{}',
  processing_date date DEFAULT CURRENT_DATE,
  processed_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_processing_costs_user_id ON processing_costs(user_id);
CREATE INDEX idx_processing_costs_book_id ON processing_costs(book_id);
CREATE INDEX idx_processing_costs_date ON processing_costs(processing_date);
CREATE INDEX idx_processing_costs_total ON processing_costs(total_cost);
```

### 3.4 Notes and AI Conversations

#### `book_notes`
```sql
CREATE TABLE book_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  
  -- Note content
  title text,
  content text NOT NULL,
  note_type text DEFAULT 'general' 
    CHECK (note_type IN ('general', 'highlight', 'bookmark', 'question')),
  
  -- Position and context
  page_number integer,
  text_selection text, -- selected text if it's a highlight
  position_metadata jsonb DEFAULT '{}', -- coordinates, etc.
  
  -- Privacy
  is_private boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_book_notes_user_id ON book_notes(user_id);
CREATE INDEX idx_book_notes_book_id ON book_notes(book_id);
CREATE INDEX idx_book_notes_page_id ON book_notes(page_id);
```

#### `ai_conversations`
```sql
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  title text,
  conversation_type text DEFAULT 'general' 
    CHECK (conversation_type IN ('general', 'summary', 'quiz', 'explanation')),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  -- Message content
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  message_metadata jsonb DEFAULT '{}', -- context, page references, etc.
  
  -- Cost tracking
  tokens_used integer DEFAULT 0,
  cost decimal(10,6) DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_book_id ON ai_conversations(book_id);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
```

## 4. Row Level Security (RLS) Policies

### 4.1 Basic User Data Access
```sql
-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- User books (library)
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own library" ON user_books
  FOR ALL USING (auth.uid() = user_id);
```

### 4.2 Book Access Control
```sql
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Users can view their own books
CREATE POLICY "Users can view their own books" ON books
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view public books
CREATE POLICY "Users can view public books" ON books
  FOR SELECT USING (visibility = 'public');

-- Users can view books shared with them
CREATE POLICY "Users can view shared books" ON books
  FOR SELECT USING (
    visibility = 'shared_with_users' 
    AND auth.uid() = ANY(shared_with)
  );

-- Users can manage their own books
CREATE POLICY "Users can manage their own books" ON books
  FOR ALL USING (auth.uid() = user_id);
```

### 4.3 Page and Content Access
```sql
-- Pages access based on book access
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view pages of accessible books" ON pages
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books 
      WHERE user_id = auth.uid() 
         OR visibility = 'public'
         OR (visibility = 'shared_with_users' AND auth.uid() = ANY(shared_with))
    )
  );

-- Similar policies for page_text and page_audio
ALTER TABLE page_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view text of accessible pages" ON page_text
  FOR SELECT USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN books b ON p.book_id = b.id
      WHERE b.user_id = auth.uid() 
         OR b.visibility = 'public'
         OR (b.visibility = 'shared_with_users' AND auth.uid() = ANY(b.shared_with))
    )
  );

CREATE POLICY "Users can view audio of accessible pages" ON page_audio
  FOR SELECT USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN books b ON p.book_id = b.id
      WHERE b.user_id = auth.uid() 
         OR b.visibility = 'public'
         OR (b.visibility = 'shared_with_users' AND auth.uid() = ANY(b.shared_with))
    )
  );
```

### 4.4 Admin Access
```sql
-- Admin-only policies for analytics
CREATE POLICY "Admins can view all data" ON processing_costs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all reading sessions" ON reading_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 5. Database Functions and Triggers

### 5.1 Automatic Timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at 
  BEFORE UPDATE ON books 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_books_updated_at 
  BEFORE UPDATE ON user_books 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 Reading Progress Calculation
```sql
CREATE OR REPLACE FUNCTION update_reading_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update reading progress when last_read_page changes
    IF NEW.last_read_page IS DISTINCT FROM OLD.last_read_page THEN
        NEW.reading_progress = (
            SELECT CASE 
                WHEN b.total_pages > 0 
                THEN (NEW.last_read_page::decimal / b.total_pages) * 100
                ELSE 0
            END
            FROM books b 
            WHERE b.id = NEW.book_id
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_books_progress 
  BEFORE UPDATE ON user_books 
  FOR EACH ROW EXECUTE FUNCTION update_reading_progress();
```

## 6. Storage Buckets (Supabase Storage)

### 6.1 Required Buckets
```sql
-- PDF files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdfs', 'pdfs', false);

-- Page images (PDF to image conversion)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('page-images', 'page-images', false);

-- Generated audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-files', 'audio-files', false);

-- Book thumbnails (public for sharing)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('thumbnails', 'thumbnails', true);

-- User avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);
```

### 6.2 Storage Policies
```sql
-- PDF access policies
CREATE POLICY "Users can upload PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pdfs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pdfs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Similar policies for other buckets...
```

## 7. API Considerations

### 7.1 Key API Endpoints
- `GET /api/books` - User's library (with public books)
- `POST /api/books` - Upload new book
- `GET /api/books/:id/pages` - Book pages with text/audio
- `POST /api/books/:id/process` - Trigger page processing
- `GET /api/reading-sessions` - User's reading history
- `POST /api/reading-sessions/:id/time` - Track listening time

### 7.2 Admin Endpoints
- `GET /api/admin/analytics/users` - User statistics
- `GET /api/admin/analytics/costs` - Cost breakdown
- `GET /api/admin/analytics/books` - Book statistics
- `GET /api/admin/analytics/listening-time` - Usage metrics

## 8. Migration Strategy

### 8.1 Phase 1: Core Setup
1. Create user profiles and basic book structure
2. Implement authentication and RLS policies
3. Set up storage buckets

### 8.2 Phase 2: Content Processing
1. Add page, text, and audio tables
2. Implement processing workflows
3. Add cost tracking

### 8.3 Phase 3: User Features
1. Add notes and conversation tables
2. Implement reading sessions tracking
3. Add social features (sharing, public books)

### 8.4 Phase 4: Analytics
1. Create admin dashboard views
2. Implement reporting functions
3. Add performance monitoring

## 9. Performance Considerations

### 9.1 Indexing Strategy
- Primary indexes on foreign keys
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., public books)

### 9.2 Data Archival
- Archive old reading sessions (>1 year)
- Compress old audio files
- Clean up orphaned storage objects

### 9.3 Caching Strategy
- Cache public book listings
- Cache user library data
- Cache processed text content

## 10. Security Considerations

### 10.1 Data Protection
- All user data protected by RLS
- Sensitive admin data requires admin role
- File access controlled by storage policies

### 10.2 API Rate Limiting
- Limit AI processing requests per user
- Throttle expensive operations
- Monitor and alert on unusual usage

### 10.3 Content Moderation
- Flag inappropriate public books
- Monitor shared content
- Implement reporting system

---

**Next Steps:**
1. Create migration files for each table
2. Set up RLS policies
3. Configure storage buckets
4. Implement API endpoints
5. Add monitoring and analytics

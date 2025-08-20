# ReadAI Database ERD (Entity Relationship Diagram)

**Version:** 1.0  
**Date:** 2025-07-24  
**Database:** Supabase (PostgreSQL)

## Overview

This document provides the Entity Relationship Diagram for the ReadAI database schema, showing the relationships between all tables and their key attributes.

## ERD Visualization

```mermaid
erDiagram
    %% Core User Management
    AUTH_USERS {
        uuid id PK
        text email
        timestamp created_at
    }
    
    USER_PROFILES {
        uuid id PK, FK
        text role
        text display_name
        text avatar_url
        jsonb preferences
        timestamp created_at
        timestamp updated_at
    }
    
    %% Book Management
    BOOKS {
        uuid id PK
        uuid user_id FK
        uuid parent_book_id FK
        text title
        text author
        text description
        text isbn
        text language
        text voice_persona
        jsonb voice_settings
        text pdf_url
        text pdf_source
        text thumbnail_url
        integer total_pages
        text visibility
        uuid_array shared_with
        text processing_status
        text processing_error
        timestamp created_at
        timestamp updated_at
    }
    
    USER_BOOKS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        text personal_title
        text_array tags
        boolean is_favorite
        integer last_read_page
        decimal reading_progress
        integer total_reading_time_minutes
        timestamp last_read_at
        timestamp created_at
        timestamp updated_at
    }
    
    %% Page Content Management
    PAGES {
        uuid id PK
        uuid book_id FK
        integer page_number
        text image_url
        integer image_width
        integer image_height
        timestamp created_at
    }
    
    PAGE_TEXT {
        uuid id PK
        uuid page_id FK
        text extracted_text
        decimal extraction_confidence
        jsonb extraction_metadata
        timestamp processed_at
        integer processing_duration_ms
    }
    
    PAGE_AUDIO {
        uuid id PK
        uuid page_id FK
        text voice_persona
        text audio_url
        integer audio_duration_seconds
        text audio_format
        bigint audio_size_bytes
        jsonb voice_settings
        jsonb generation_metadata
        timestamp processed_at
        integer processing_duration_ms
    }
    
    %% User Activity & Analytics
    READING_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        integer start_page
        integer end_page
        integer pages_read
        integer listening_time_minutes
        text voice_persona
        decimal playback_speed
        jsonb session_metadata
        timestamp started_at
        timestamp ended_at
        text session_status
    }
    
    PROCESSING_COSTS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        uuid page_id FK
        decimal text_extraction_cost
        decimal text_to_speech_cost
        decimal conversation_cost
        decimal total_cost
        integer tokens_used_text
        integer tokens_used_audio
        integer tokens_used_conversation
        jsonb cost_breakdown
        date processing_date
        timestamp processed_at
    }
    
    %% Notes & AI Features
    BOOK_NOTES {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        uuid page_id FK
        text title
        text content
        text note_type
        integer page_number
        text text_selection
        jsonb position_metadata
        boolean is_private
        timestamp created_at
        timestamp updated_at
    }
    
    AI_CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        text title
        text conversation_type
        timestamp created_at
        timestamp updated_at
    }
    
    AI_MESSAGES {
        uuid id PK
        uuid conversation_id FK
        text role
        text content
        jsonb message_metadata
        integer tokens_used
        decimal cost
        timestamp created_at
    }
    
    %% Relationships
    AUTH_USERS ||--|| USER_PROFILES : "has profile"
    AUTH_USERS ||--o{ BOOKS : "owns"
    AUTH_USERS ||--o{ USER_BOOKS : "has library"
    AUTH_USERS ||--o{ READING_SESSIONS : "tracks sessions"
    AUTH_USERS ||--o{ PROCESSING_COSTS : "incurs costs"
    AUTH_USERS ||--o{ BOOK_NOTES : "creates notes"
    AUTH_USERS ||--o{ AI_CONVERSATIONS : "has conversations"
    
    BOOKS ||--o{ BOOKS : "parent-child voices"
    BOOKS ||--o{ USER_BOOKS : "bookmarked by users"
    BOOKS ||--o{ PAGES : "contains"
    BOOKS ||--o{ READING_SESSIONS : "read in sessions"
    BOOKS ||--o{ PROCESSING_COSTS : "generates costs"
    BOOKS ||--o{ BOOK_NOTES : "has notes"
    BOOKS ||--o{ AI_CONVERSATIONS : "discussed in"
    
    PAGES ||--|| PAGE_TEXT : "has text"
    PAGES ||--o{ PAGE_AUDIO : "has audio versions"
    PAGES ||--o{ PROCESSING_COSTS : "generates costs"
    PAGES ||--o{ BOOK_NOTES : "annotated with"
    
    AI_CONVERSATIONS ||--o{ AI_MESSAGES : "contains"
```

## Table Relationships Detailed

### 1. User Management Chain
```
AUTH_USERS (Supabase) 
    ↓ 1:1
USER_PROFILES
    ↓ 1:many
[BOOKS, USER_BOOKS, READING_SESSIONS, PROCESSING_COSTS, BOOK_NOTES, AI_CONVERSATIONS]
```

### 2. Book Hierarchy
```
BOOKS (Parent)
    ↓ 1:many (self-reference)
BOOKS (Children - Voice Personas)
    ↓ 1:many
PAGES
    ↓ 1:1          ↓ 1:many
PAGE_TEXT    PAGE_AUDIO (per voice)
```

### 3. User Library System
```
USER (via AUTH)
    ↓ many:many (through USER_BOOKS)
BOOKS (Bookmark system - no data duplication)
```

### 4. Activity Tracking
```
USER + BOOK
    ↓
READING_SESSIONS (listening behavior)
    ↓
PROCESSING_COSTS (cost aggregation)
```

### 5. Content Enhancement
```
BOOK + USER
    ↓ 1:many
BOOK_NOTES (annotations)

BOOK + USER  
    ↓ 1:many
AI_CONVERSATIONS
    ↓ 1:many
AI_MESSAGES (chat history)
```

## Key Design Patterns

### 1. Cascade Deletion Support
- **User deletion** → All user data deleted automatically
- **Book deletion** → All related pages, text, audio, notes deleted
- **Page deletion** → Related text, audio, notes deleted

### 2. Parent-Child Book Structure
```sql
-- Parent book (original)
books: id=1, parent_book_id=NULL, voice_persona=NULL

-- Child books (voice variations)
books: id=2, parent_book_id=1, voice_persona='british_male'
books: id=3, parent_book_id=1, voice_persona='female_calm'
```

### 3. Bookmark Reference System
```sql
-- User bookmarks parent book
user_books: user_id=123, book_id=1 (parent)

-- User gets access to all voice versions (children)
-- No need to bookmark each voice separately
```

### 4. Multi-Voice Audio Storage
```sql
-- Same page, multiple audio versions
page_audio: page_id=1, voice_persona='default'
page_audio: page_id=1, voice_persona='british_male'  
page_audio: page_id=1, voice_persona='female_calm'
```

### 5. Privacy & Sharing Model
```sql
-- Private book
books: visibility='private', shared_with=[]

-- Public book
books: visibility='public', shared_with=[]

-- Selective sharing
books: visibility='shared_with_users', shared_with=[uuid1, uuid2]
```

## Storage Integration

### Supabase Storage Buckets
```
pdfs/           → books.pdf_url
page-images/    → pages.image_url  
audio-files/    → page_audio.audio_url
thumbnails/     → books.thumbnail_url (public)
avatars/        → user_profiles.avatar_url (public)
```

### File Organization Pattern
```
pdfs/{user_id}/{book_id}/original.pdf
page-images/{book_id}/page_{page_number}.jpg
audio-files/{book_id}/{voice_persona}/page_{page_number}.wav
thumbnails/{book_id}/cover.jpg
avatars/{user_id}/profile.jpg
```

## Security Boundaries

### Row Level Security (RLS) Scope
```
1. USER ISOLATION
   - Users only see their own data
   - Exception: Public/shared books

2. BOOK ACCESS CONTROL  
   - Private: Owner only
   - Public: All authenticated users
   - Shared: Specific users in shared_with array

3. ADMIN PRIVILEGES
   - Full read access to analytics tables
   - No write access to user data
   - Separate admin-only views/functions
```

### Data Access Patterns
```sql
-- Regular user sees:
SELECT * FROM books 
WHERE user_id = auth.uid() 
   OR visibility = 'public'
   OR (visibility = 'shared_with_users' AND auth.uid() = ANY(shared_with))

-- Admin sees (analytics only):
SELECT aggregate_data FROM processing_costs
WHERE EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE id = auth.uid() AND role = 'admin'
)
```

## Performance Optimizations

### Critical Indexes
```sql
-- User data access
idx_books_user_id (user_id)
idx_user_books_user_id (user_id)  
idx_reading_sessions_user_id (user_id)

-- Book relationships
idx_books_parent_book_id (parent_book_id)
idx_pages_book_id (book_id)

-- Public content discovery
idx_books_visibility (visibility)
idx_books_processing_status (processing_status)

-- Analytics queries  
idx_processing_costs_date (processing_date)
idx_reading_sessions_started_at (started_at)
```

### Query Optimization Patterns
```sql
-- Efficient library loading
SELECT b.*, ub.last_read_page, ub.reading_progress
FROM books b
JOIN user_books ub ON b.id = ub.book_id  
WHERE ub.user_id = $1

-- Voice persona discovery
SELECT child.* FROM books child
WHERE child.parent_book_id = $1

-- Page content loading (with prefetch)
SELECT p.*, pt.extracted_text, pa.audio_url
FROM pages p
LEFT JOIN page_text pt ON p.id = pt.page_id
LEFT JOIN page_audio pa ON p.id = pa.page_id AND pa.voice_persona = $2
WHERE p.book_id = $1 AND p.page_number BETWEEN $3 AND $4
```

## Analytics & Reporting Views

### Admin Dashboard Queries
```sql
-- User growth
SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) 
FROM user_profiles 
GROUP BY month

-- Cost breakdown  
SELECT user_id, SUM(total_cost) as total_spent,
       SUM(text_extraction_cost) as ocr_costs,
       SUM(text_to_speech_cost) as tts_costs
FROM processing_costs
GROUP BY user_id

-- Usage patterns
SELECT voice_persona, 
       SUM(listening_time_minutes) as total_minutes,
       COUNT(DISTINCT user_id) as unique_users
FROM reading_sessions
GROUP BY voice_persona
```

---

This ERD provides a comprehensive view of the ReadAI database structure, showing how all components work together to support the multi-user book reading platform with AI-powered features.

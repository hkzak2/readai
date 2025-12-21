# Voice Persona Feature Implementation Plan

## Overview

This document outlines the complete implementation plan for the Voice Persona feature in ReadAI. The feature allows users to create, customize, and use personalized voice personas for text-to-speech reading of their books.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Voice Studio   │  │  Book Reader    │  │  Persona API    │  │
│  │  (Create/Edit)  │  │  (Use Persona)  │  │  Service Layer  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Node.js/Express)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Voice Persona   │  │  Gemini TTS     │  │   Page Cache    │  │
│  │   Controller    │  │    Service      │  │    Service      │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ voice_personas  │  │  page_audio     │  │    Storage      │  │
│  │     table       │  │  (existing)     │  │  (audio files)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Gemini TTS API                         │
│              gemini-2.5-flash-preview-tts model                  │
└─────────────────────────────────────────────────────────────────┘
```

## Google Gemini TTS Reference

### Available Base Voices (Selected for ReadAI)

| Voice Name | Recommended Use Case |
|------------|---------------------|
| Enceladus  | General reading     |
| Lapetus    | Calm narration      |
| Algieba    | Expressive reading  |
| Algenib    | Professional tone   |
| Alnilam    | Deep, authoritative |
| Schedar    | Warm, friendly      |

### Prompt Structure for Controllable TTS

The Gemini TTS API uses natural language prompts to control speech style:

```javascript
// Example prompt structure
const prompt = `Read the following text in a [PACE], [TONE] voice with [EMOTION] expression: 

[TEXT_TO_READ]`;

// Real example
const prompt = `Read the following text in a slow, warm voice with calm expression: 

بسم الله الرحمن الرحيم`;
```

### Voice Configuration Object

```javascript
const config = {
  responseModalities: ['AUDIO'],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Enceladus'  // Base voice from Google
      }
    }
  }
};
```

---

## Phase 1: Database Schema

### Supabase SQL Migration

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- Voice Personas Table
-- ============================================
-- Stores user-created voice personas with customizable settings

CREATE TABLE IF NOT EXISTS voice_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Google TTS Voice Configuration
    base_voice_name VARCHAR(50) NOT NULL DEFAULT 'Enceladus',
    -- Options: Enceladus, Lapetus, Algieba, Algenib, Alnilam, Schedar
    
    -- Style Prompt Components (combined to create the system instruction)
    pace VARCHAR(20) DEFAULT 'normal',          -- slow, normal, fast
    tone VARCHAR(30) DEFAULT 'neutral',         -- warm, neutral, professional, dramatic
    emotion VARCHAR(30) DEFAULT 'calm',         -- calm, enthusiastic, serious, gentle
    speaking_style VARCHAR(50) DEFAULT 'narrative', -- narrative, conversational, educational, storytelling
    
    -- Custom prompt override (if user wants full control)
    custom_prompt TEXT,
    
    -- Settings
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    preview_audio_url TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_voice_personas_user_id ON voice_personas(user_id);
CREATE INDEX idx_voice_personas_is_default ON voice_personas(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_voice_personas_active ON voice_personas(user_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE voice_personas ENABLE ROW LEVEL SECURITY;

-- Users can only see their own personas
CREATE POLICY "Users can view own personas" ON voice_personas
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own personas
CREATE POLICY "Users can create own personas" ON voice_personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own personas
CREATE POLICY "Users can update own personas" ON voice_personas
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own personas
CREATE POLICY "Users can delete own personas" ON voice_personas
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_voice_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_personas_updated_at
    BEFORE UPDATE ON voice_personas
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_personas_updated_at();

-- ============================================
-- Default Personas (System-provided templates)
-- ============================================
-- These are created per-user on first access or can be seeded

CREATE TABLE IF NOT EXISTS voice_persona_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_voice_name VARCHAR(50) NOT NULL,
    pace VARCHAR(20) DEFAULT 'normal',
    tone VARCHAR(30) DEFAULT 'neutral',
    emotion VARCHAR(30) DEFAULT 'calm',
    speaking_style VARCHAR(50) DEFAULT 'narrative',
    custom_prompt TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates
INSERT INTO voice_persona_templates (name, description, base_voice_name, pace, tone, emotion, speaking_style, icon, sort_order) VALUES
('Scholar', 'A calm, authoritative voice perfect for academic and religious texts', 'Alnilam', 'slow', 'professional', 'serious', 'educational', 'graduation-cap', 1),
('Storyteller', 'A warm, engaging voice ideal for narrative and fiction', 'Schedar', 'normal', 'warm', 'gentle', 'storytelling', 'book-open', 2),
('Companion', 'A friendly, conversational voice for casual reading', 'Algieba', 'normal', 'warm', 'calm', 'conversational', 'heart', 3),
('Narrator', 'A clear, neutral voice for general content', 'Enceladus', 'normal', 'neutral', 'calm', 'narrative', 'mic', 4),
('Night Reader', 'A soft, soothing voice perfect for bedtime reading', 'Lapetus', 'slow', 'warm', 'gentle', 'narrative', 'moon', 5);

-- ============================================
-- Update existing page_audio table (if needed)
-- ============================================
-- Add voice_persona_id reference to track which persona was used

ALTER TABLE page_audio 
ADD COLUMN IF NOT EXISTS voice_persona_id UUID REFERENCES voice_personas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_page_audio_persona ON page_audio(voice_persona_id);
```

---

## Phase 2: Backend Implementation

### 2.1 Voice Persona Service

**File: `backend/src/services/voicePersonaService.js`**

```javascript
const supabaseService = require('./supabaseService');
const logger = require('../config/logger');

class VoicePersonaService {
  
  // Build the TTS prompt from persona settings
  buildPrompt(persona, textToRead) {
    // If custom prompt exists, use it
    if (persona.custom_prompt) {
      return `${persona.custom_prompt}

${textToRead}`;
    }
    
    // Build prompt from components
    const paceMap = {
      slow: 'at a slow, measured pace',
      normal: 'at a natural pace',
      fast: 'at a brisk pace'
    };
    
    const toneMap = {
      warm: 'warm and friendly',
      neutral: 'clear and neutral',
      professional: 'professional and authoritative',
      dramatic: 'dramatic and expressive'
    };
    
    const emotionMap = {
      calm: 'calm expression',
      enthusiastic: 'enthusiastic energy',
      serious: 'serious demeanor',
      gentle: 'gentle and soothing manner'
    };
    
    const styleMap = {
      narrative: 'as a narrator',
      conversational: 'in a conversational way',
      educational: 'as an educator',
      storytelling: 'as a storyteller'
    };
    
    const pace = paceMap[persona.pace] || paceMap.normal;
    const tone = toneMap[persona.tone] || toneMap.neutral;
    const emotion = emotionMap[persona.emotion] || emotionMap.calm;
    const style = styleMap[persona.speaking_style] || styleMap.narrative;
    
    return `Read the following text ${style}, ${pace}, with a ${tone} voice and ${emotion}:

${textToRead}`;
  }
  
  // Get all personas for a user
  async getUserPersonas(userId) {
    return await supabaseService.query('voice_personas', {
      filter: { user_id: userId, is_active: true },
      orderBy: { column: 'created_at', ascending: false }
    });
  }
  
  // Get user's default persona
  async getDefaultPersona(userId) {
    const personas = await supabaseService.query('voice_personas', {
      filter: { user_id: userId, is_default: true, is_active: true },
      limit: 1
    });
    return personas[0] || null;
  }
  
  // Create new persona
  async createPersona(userId, personaData) {
    // If setting as default, unset other defaults first
    if (personaData.is_default) {
      await this.unsetDefaultPersona(userId);
    }
    
    return await supabaseService.insert('voice_personas', {
      user_id: userId,
      ...personaData
    });
  }
  
  // Update persona
  async updatePersona(personaId, userId, updates) {
    if (updates.is_default) {
      await this.unsetDefaultPersona(userId);
    }
    
    return await supabaseService.update('voice_personas', personaId, updates, {
      filter: { user_id: userId }
    });
  }
  
  // Delete persona
  async deletePersona(personaId, userId) {
    return await supabaseService.delete('voice_personas', personaId, {
      filter: { user_id: userId }
    });
  }
  
  // Unset default persona
  async unsetDefaultPersona(userId) {
    // Implementation depends on supabaseService capabilities
  }
  
  // Get templates for new users
  async getTemplates() {
    return await supabaseService.query('voice_persona_templates', {
      filter: { is_active: true },
      orderBy: { column: 'sort_order', ascending: true }
    });
  }
  
  // Create personas from templates for new user
  async initializeUserPersonas(userId) {
    const templates = await this.getTemplates();
    
    for (const template of templates) {
      await this.createPersona(userId, {
        name: template.name,
        description: template.description,
        base_voice_name: template.base_voice_name,
        pace: template.pace,
        tone: template.tone,
        emotion: template.emotion,
        speaking_style: template.speaking_style,
        is_default: template.sort_order === 1
      });
    }
  }
  
  // Increment usage count
  async recordUsage(personaId) {
    // Increment usage_count and update last_used_at
  }
}

module.exports = new VoicePersonaService();
```

### 2.2 Update Gemini Service

**File: `backend/src/services/geminiService.js`**

Update the `generateAudio` method:

```javascript
async generateAudio(text, voiceName = 'Enceladus', systemPrompt = null) {
  // Build the content with optional system prompt
  let contentText = text;
  if (systemPrompt) {
    contentText = `${systemPrompt}

${text}`;
  }
  
  const truncatedText = contentText.length > config.maxTextLength 
    ? contentText.substring(0, config.maxTextLength) + "..." 
    : contentText;

  const modelConfig = {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceName,
        }
      }
    },
  };

  const model = 'gemini-2.5-flash-preview-tts'; // Use TTS-specific model
  const contents = [
    { 
      parts: [
        { 
          text: truncatedText 
        }
      ] 
    }
  ];

  logger.debug(`Calling Gemini TTS model with voice: ${voiceName}`);
  
  return this.retryWithBackoff(async () => {
    try {
      const response = await this.ai.models.generateContent({
        model,
        contents,
        config: modelConfig,
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        throw new Error('No audio data in response');
      }

      return {
        data: audioData,
        mimeType: response.candidates[0].content.parts[0].inlineData.mimeType || 'audio/wav'
      };
    } catch (error) {
      logger.error('Error in Gemini TTS processing:', error);
      throw error;
    }
  });
}
```

### 2.3 Voice Persona Controller

**File: `backend/src/controllers/voicePersonaController.js`**

```javascript
const voicePersonaService = require('../services/voicePersonaService');
const geminiService = require('../services/geminiService');
const logger = require('../config/logger');

// GET /api/voice-personas
exports.getPersonas = async (req, res) => {
  try {
    const userId = req.user.id;
    const personas = await voicePersonaService.getUserPersonas(userId);
    res.json({ success: true, data: personas });
  } catch (error) {
    logger.error('Error fetching personas:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personas' });
  }
};

// POST /api/voice-personas
exports.createPersona = async (req, res) => {
  try {
    const userId = req.user.id;
    const persona = await voicePersonaService.createPersona(userId, req.body);
    res.status(201).json({ success: true, data: persona });
  } catch (error) {
    logger.error('Error creating persona:', error);
    res.status(500).json({ success: false, error: 'Failed to create persona' });
  }
};

// PUT /api/voice-personas/:id
exports.updatePersona = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const persona = await voicePersonaService.updatePersona(id, userId, req.body);
    res.json({ success: true, data: persona });
  } catch (error) {
    logger.error('Error updating persona:', error);
    res.status(500).json({ success: false, error: 'Failed to update persona' });
  }
};

// DELETE /api/voice-personas/:id
exports.deletePersona = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await voicePersonaService.deletePersona(id, userId);
    res.json({ success: true, message: 'Persona deleted' });
  } catch (error) {
    logger.error('Error deleting persona:', error);
    res.status(500).json({ success: false, error: 'Failed to delete persona' });
  }
};

// POST /api/voice-personas/:id/preview
exports.previewPersona = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    
    // Get persona
    const personas = await voicePersonaService.getUserPersonas(userId);
    const persona = personas.find(p => p.id === id);
    
    if (!persona) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }
    
    // Build prompt and generate audio
    const prompt = voicePersonaService.buildPrompt(persona, text);
    const audio = await geminiService.generateAudio(
      text,
      persona.base_voice_name,
      prompt
    );
    
    res.json({ 
      success: true, 
      data: {
        audio: audio.data,
        mimeType: audio.mimeType
      }
    });
  } catch (error) {
    logger.error('Error previewing persona:', error);
    res.status(500).json({ success: false, error: 'Failed to generate preview' });
  }
};

// GET /api/voice-personas/templates
exports.getTemplates = async (req, res) => {
  try {
    const templates = await voicePersonaService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
};
```

### 2.4 Routes

**File: `backend/src/routes/voicePersonaRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const voicePersonaController = require('../controllers/voicePersonaController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', voicePersonaController.getPersonas);
router.post('/', voicePersonaController.createPersona);
router.get('/templates', voicePersonaController.getTemplates);
router.put('/:id', voicePersonaController.updatePersona);
router.delete('/:id', voicePersonaController.deletePersona);
router.post('/:id/preview', voicePersonaController.previewPersona);

module.exports = router;
```

---

## Phase 3: Frontend Implementation

### 3.1 API Service

**File: `frontend/src/services/voicePersonaApi.ts`**

```typescript
import api from './api';

export interface VoicePersona {
  id: string;
  name: string;
  description?: string;
  base_voice_name: string;
  pace: 'slow' | 'normal' | 'fast';
  tone: 'warm' | 'neutral' | 'professional' | 'dramatic';
  emotion: 'calm' | 'enthusiastic' | 'serious' | 'gentle';
  speaking_style: 'narrative' | 'conversational' | 'educational' | 'storytelling';
  custom_prompt?: string;
  is_default: boolean;
  is_active: boolean;
  preview_audio_url?: string;
  usage_count: number;
  created_at: string;
}

export const voicePersonaApi = {
  getAll: () => api.get<VoicePersona[]>('/voice-personas'),
  
  create: (data: Partial<VoicePersona>) => 
    api.post<VoicePersona>('/voice-personas', data),
  
  update: (id: string, data: Partial<VoicePersona>) => 
    api.put<VoicePersona>(`/voice-personas/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/voice-personas/${id}`),
  
  preview: (id: string, text: string) => 
    api.post<{ audio: string; mimeType: string }>(`/voice-personas/${id}/preview`, { text }),
  
  getTemplates: () => 
    api.get('/voice-personas/templates'),
};
```

### 3.2 Update Voice Studio Page

Update `frontend/src/pages/VoiceStudio.tsx` to:

1. Fetch real personas from API
2. Create/edit/delete functionality
3. Preview audio playback
4. Save settings to database
5. Use Google's base voice names

### 3.3 Update Book Reader

Update the book reader to:

1. Use selected persona when generating audio
2. Pass persona settings to the audio generation endpoint

---

## Phase 4: Integration

### 4.1 Update Page Audio Generation

**File: `backend/src/services/pageCacheService.js`**

Update `getOrGeneratePageAudio` to accept and use voice persona:

```javascript
async getOrGeneratePageAudio(bookId, pageNumber, text, personaId, userId) {
  // Get persona settings
  const persona = personaId 
    ? await voicePersonaService.getPersonaById(personaId, userId)
    : await voicePersonaService.getDefaultPersona(userId);
  
  // Build prompt from persona
  const prompt = voicePersonaService.buildPrompt(persona, text);
  
  // Generate audio with persona settings
  const { data: audioData, mimeType } = await geminiService.generateAudio(
    text,
    persona.base_voice_name,
    prompt
  );
  
  // ... rest of caching logic
}
```

---

## Execution Order

### Week 1: Database & Core Backend
1. Run Supabase migration SQL
2. Create `voicePersonaService.js`
3. Update `geminiService.js` with new `generateAudio` signature
4. Create `voicePersonaController.js`
5. Add routes and test with Postman/curl

### Week 2: Backend Integration
1. Update `pageCacheService.js` to use personas
2. Update `pageController.js` to accept persona ID
3. Test end-to-end audio generation with personas
4. Add error handling and validation

### Week 3: Frontend
1. Create `voicePersonaApi.ts` service
2. Update `VoiceStudio.tsx` with real API calls
3. Build persona creation/editing modal
4. Implement audio preview functionality
5. Add loading states and error handling

### Week 4: Polish & Testing
1. Update book reader to use selected persona
2. Add persona selection UI in reader
3. Test with Arabic text
4. Performance optimization
5. User testing and feedback

---

## Testing Checklist

- [ ] Create persona with all settings
- [ ] Update persona settings
- [ ] Delete persona
- [ ] Set default persona
- [ ] Preview audio with persona
- [ ] Generate page audio with persona
- [ ] Arabic text pronunciation
- [ ] Pace/tone/emotion variations work
- [ ] Custom prompt override works
- [ ] RLS policies work correctly
- [ ] Error handling for API failures

---

## Notes

### Arabic Language Support

Gemini TTS supports Arabic. Ensure:
1. Text encoding is UTF-8
2. Test with various Arabic diacritics (tashkeel)
3. Consider RTL rendering in UI

### Performance Considerations

1. Cache generated audio by persona+text hash
2. Limit preview text length (50-100 words)
3. Consider queuing for long books

### Future Enhancements

1. Voice cloning (when available)
2. Emotion detection from text
3. Multi-speaker for dialogue
4. Speed/pitch fine-tuning
5. Pronunciation dictionary for names

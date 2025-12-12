# Auto-Play with Audio Prefetching Feature

## Overview
Add continuous auto-play functionality that automatically advances through pages while intelligently prefetching audio one page ahead to ensure seamless playback without interruptions.

## User Experience Goals
- Press Play once to read through multiple pages continuously
- Smooth transitions between pages with no loading delays
- Manual navigation controls remain fully functional
- User can enable/disable auto-play at any time
- Visual feedback for prefetch status

## Technical Approach

### State Management
- Add prefetchedAudio Map to store prepared Audio objects by page number
- Add isPrefetching boolean for UI feedback
- Add autoPlayEnabled boolean for user preference
- Track prefetch metadata (url, duration, ready status)

### Core Features

#### 1. Audio Prefetching
- Trigger prefetch when current page audio starts playing
- Run page capture → text extraction → audio generation in background
- Store prefetched Audio object in memory for instant playback
- Leverage existing cache system via apiService methods
- Limit prefetch to N+1 page only (1-page-ahead strategy)

#### 2. Auto-Advance on Audio End
- Modify audio 'ended' event listener to check autoPlayEnabled flag
- If enabled and not on last page: advance to next page automatically
- If prefetch complete: play immediately without delay
- If prefetch incomplete: show toast, proceed with standard flow

#### 3. Smart Playback Logic
- Check prefetchedAudio Map before triggering full pipeline
- Use cached Audio object if available for current page
- Clear used prefetch entries to prevent memory leaks
- Trigger new prefetch for next page after playback starts

#### 4. Manual Navigation Compatibility
- Preserve manual next/previous page controls
- Cancel in-flight prefetch requests on manual navigation
- Don't reset audio if prefetch available for target page
- Reset autoPlayEnabled if user skips multiple pages

#### 5. UI Controls
- Add toggle button for auto-play (near Play/Pause button)
- Show subtle toast notifications for prefetch status
- Optional: Visual indicator showing prefetch readiness

### Error Handling
- Gracefully fall back to on-demand generation if prefetch fails
- Handle rate limits without interrupting current playback
- Show unobtrusive error toasts for prefetch failures
- Continue playback even if next page prefetch encounters issues

### Performance Considerations
- Start with 1-page-ahead prefetching to minimize API costs
- Respect rate limits (100 req/15min per backend config)
- Clear Audio objects after use to prevent memory leaks
- Limit prefetch cache to 3 pages maximum

### Future Enhancements
- Backend batch endpoint for parallel multi-page requests
- Expand prefetch range to 2-3 pages based on usage patterns
- Cache-aware prefetch (skip if already cached in backend)
- User setting for prefetch aggressiveness
- Display cache status per page in UI

## Implementation Status
- [x] Add prefetch state management
- [x] Implement prefetchNextPageAudio function
- [x] Add auto-advance on 'ended' event
- [x] Update handleReadPage to use prefetched audio
- [x] Modify navigation to preserve prefetch
- [x] Add auto-play UI toggle
- [x] Add prefetch status indicators
- [x] Implement hidden page rendering for actual prefetch
- [ ] Test edge cases (last page, rapid navigation, errors)

## Testing Checklist
- [ ] Auto-play advances through multiple pages
- [ ] Prefetched audio plays instantly on page advance
- [ ] Manual navigation still works correctly
- [ ] Auto-play stops at last page
- [ ] Disabling auto-play mid-playback works
- [ ] Rapid manual page changes cancel prefetch
- [ ] Rate limit errors don't break playback
- [ ] Memory doesn't leak with extended use
- [ ] Cache hits work with prefetch system
- [ ] UI indicators show correct prefetch status

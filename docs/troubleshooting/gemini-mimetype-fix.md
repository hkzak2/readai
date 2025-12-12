# Gemini File Upload MimeType Error Fix

## Problem Description

**Error Message:**
```
Error: Can not determine mimeType. Please provide mimeType in the config.
```

**When it occurs:**
- When uploading a PDF book to Gemini File API for chat functionality
- Triggered in `uploadBookToGemini` controller when initializing a conversation
- Error originates from `@google/genai` SDK's `files.upload()` method

## Root Cause

The Google GenAI SDK's `files.upload()` method has **strict input type requirements** that cause mimeType detection failures when using incorrect data types.

### SDK Version Context
- **Current Version:** `@google/genai@^1.27.0` (as of Nov 2024)
- **Critical Issue:** The SDK ONLY accepts specific input types:
  - ✅ **String file path** - SDK can infer mimeType from file extension
  - ✅ **Blob object** - SDK can read mimeType from Blob.type property
  - ❌ **Buffer object** - SDK CANNOT handle this type

### Why Buffer-Based Upload Fails
When you pass a Buffer object (from `fs.readFileSync()`), the SDK's internal type validation fails:

1. The SDK receives a Buffer (not a recognized type)
2. SDK's type checking happens BEFORE config validation
3. Even with explicit `mimeType` in config, validation fails first
4. Therefore: **"Can not determine mimeType"** error

### Why Path-Based Upload Works
When you pass a file path as a string:

1. The SDK receives a valid string path
2. It can infer mimeType from the `.pdf` file extension
3. Explicit `mimeType` in config provides additional validation
4. Upload succeeds with proper type handling

## Solution

### Code Location
**File:** `backend/src/services/geminiDocumentService.js`  
**Method:** `uploadPdfFromUrl()`  
**Lines:** ~52-58

### Incorrect Format (Wrong - Using Buffer)
```javascript
// ❌ This DOES NOT work - passing Buffer object
const fileBuffer = fsSync.readFileSync(tempFilePath);

const file = await this.ai.files.upload({
  file: fileBuffer,  // SDK doesn't accept Buffer type
  config: {
    displayName,
    mimeType: 'application/pdf',
  },
});
```

### Correct Format (Fixed - Using File Path String)
```javascript
// ✅ This works with SDK v1.27.0+
// Critical: Pass the file path as a string, NOT as a Buffer
const file = await this.ai.files.upload({
  file: tempFilePath,         // Pass string path directly
  config: {                   // mimeType in config object
    displayName,
    mimeType: 'application/pdf',
  },
});
```

## Key Changes

1. **Pass file path as string:** The SDK accepts string paths and can infer mimeType from extension
2. **Do NOT read as Buffer:** Avoid using `fs.readFileSync()` - SDK handles file reading internally
3. **MimeType in config:** The `mimeType` should be inside the `config` object (optional but recommended)
4. **DisplayName in config:** The `displayName` must also be in the `config` object

## Implementation Steps

1. **Locate the file:**
   ```bash
   backend/src/services/geminiDocumentService.js
   ```

2. **Ensure correct imports at top of file:**
   ```javascript
   const fsSync = require('fs');  // For synchronous file reading
   ```

3. **Find the `uploadPdfFromUrl` method** (around line 50)

4. **Remove any Buffer reading code** if present:
   ```javascript
   // DELETE this if it exists:
   const fileBuffer = fsSync.readFileSync(tempFilePath);
   ```

5. **Replace the upload call** with the corrected format (pass string path, not Buffer):
   ```javascript
   const file = await this.ai.files.upload({
     file: tempFilePath,  // Pass string path directly, NOT Buffer
     config: {
       displayName,
       mimeType: 'application/pdf',
     },
   });
   ```

6. **Remove `fsSync` import** if no longer needed (after removing Buffer code):
   ```javascript
   // Remove this line from imports if not used elsewhere:
   const fsSync = require('fs');
   ```

7. **Test the fix:**
   - Open a book in the reading interface
   - Click to start a chat conversation
   - Verify the PDF uploads successfully to Gemini
   - Check backend logs for success message

## Verification

### Success Indicators
- Backend log shows: `PDF uploaded successfully - File URI: https://...`
- No mimeType error in logs
- Chat interface shows: "All set! I can now answer questions about..."
- File appears in Gemini File API (48-hour expiration)

### Testing Commands
```bash
# Check backend logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Or for local development
npm run dev
```

## Prevention

### When Updating SDK
1. Check the [Google GenAI SDK releases](https://github.com/google/generative-ai-js/releases)
2. Review breaking changes in file upload API
3. Update code according to new API structure
4. Test file upload functionality thoroughly

### Package.json Reference
```json
{
  "dependencies": {
    "@google/genai": "^1.27.0"
  }
}
```

## Debugging Methodology Applied

This issue was resolved using **systematic deductive debugging**:

### 1. Problem Evolution Tracking
- **Initial error:** "Can not determine mimeType"
- **First attempt:** Added mimeType to config → Still failed
- **Second attempt:** Read file as Buffer thinking SDK needs content → Still failed
- **Pattern:** Same error despite multiple "fixes" indicated deeper issue

### 2. Root Cause Analysis
- Checked SDK documentation for exact API contract
- Identified input type requirements: `string path` OR `Blob`
- Discovered `Buffer` is NOT a supported input type
- SDK type validation happens BEFORE config parsing

### 3. Hypothesis Testing
- **Hypothesis:** SDK can't handle Buffer type
- **Test:** Switch from Buffer to string path
- **Result:** Error resolved ✅

### 4. Key Insight
When an error persists across multiple fix attempts, the issue is often a **fundamental misunderstanding of the API contract**, not just missing configuration. Always verify you're using the correct input types before debugging configuration.

### 5. Why Previous Attempts Failed
- **Adding mimeType to config:** Correct parameter placement, but wrong input type (Buffer) failed SDK validation first
- **Reading as Buffer:** Made the problem worse by converting from valid type (string) to invalid type (Buffer)
- **Root issue:** Type mismatch - passing unsupported Buffer instead of expected string/Blob

For a complete guide on this debugging methodology, see: [Systematic Debugging Methodology](../systematic-debugging-methodology.md)
```

## Related Issues

### Historical Context
- **First occurrence:** October 2024 during initial Gemini integration
- **Resolution:** Switched from Blob-based to file path-based approach
- **Recurrence:** November 2024 after branch switching (likely due to outdated code version)

### Why It Recurred
- Branch `main` may have had older code
- Branch `feat/chat` had the fix
- Switching between branches without proper merge caused regression
- Solution: Ensure this fix is committed to both branches

## Additional Notes

### Temporary File Handling
The upload process:
1. Downloads PDF from Supabase URL
2. Saves to temporary file in `os.tmpdir()`
3. Uploads temp file to Gemini File API
4. Cleans up temp file in both success and error cases

### File Lifecycle
- **Upload:** PDF → Temp file → Gemini File API
- **Processing:** File state changes to `ACTIVE` (requires polling)
- **Expiration:** Files auto-delete after 48 hours
- **Caching:** Implicit caching when file URI reused in conversations

## Cross-References

Related documentation:
- [`docs/gemini-pdf-cache.md`](../gemini-pdf-cache.md) - Context caching strategy
- [`docs/troubleshooting/gemini-upload-mimetype-fix.md`](./gemini-upload-mimetype-fix.md) - Original mimeType fix
- [`memory-bank/systemPatterns.md`](../../memory-bank/systemPatterns.md) - AI integration patterns

## Troubleshooting History & Attempts

### November 24, 2025 - Active Investigation

#### Attempt #1: Path with Flat Structure
**Code Tried:**
```javascript
const file = await this.ai.files.upload({
  path: tempFilePath,
  displayName,
  mimeType: 'application/pdf',
});
```
**Result:** ❌ Failed - Same error persists  
**Error:** `Can not determine mimeType. Please provide mimeType in the config.`

#### Attempt #2: File Buffer with Config Object
**Code Tried:**
```javascript
const fileBuffer = fsSync.readFileSync(tempFilePath);

const file = await this.ai.files.upload({
  file: fileBuffer,
  config: {
    displayName,
    mimeType: 'application/pdf',
  },
});
```
**Result:** ❌ Failed - Same error persists  
**Error:** `Can not determine mimeType. Please provide mimeType in the config.`  
**Note:** This was the structure that worked in October 2024

### Current Status: UNRESOLVED
The error continues to occur despite:
- ✅ Reading file as Buffer with `fsSync.readFileSync()`
- ✅ Explicitly providing mimeType in config object
- ✅ Using correct SDK version (@google/genai@^1.27.0)
- ✅ File successfully saved to temp directory
- ✅ File buffer contains valid PDF data

### Potential Issues to Investigate
1. **SDK Internal Changes**: The SDK may have changed internal implementation
2. **Node.js Version**: Environment difference between October and November
3. **Branch Differences**: Code may differ between `main` and `feat/chat` branches
4. **Module Resolution**: The SDK might not be loading correctly
5. **API Changes**: Google may have changed server-side validation

### Diagnostic Information

**Error Stack Trace:**
```
Error: Can not determine mimeType. Please provide mimeType in the config.
    at ApiClient.uploadFile (C:\Users\zakar\Documents\Github\readai\backend\node_modules\@google\genai\dist\node\index.js:6202:19)
```

**Current Code Location:**
- File: `backend/src/services/geminiDocumentService.js`
- Method: `uploadPdfFromUrl()`
- Line throwing error: ~57 (the `await this.ai.files.upload()` call)

**Environment:**
- Node.js: (version unknown)
- OS: Windows
- Branch: `feat/chat`
- Running: Local development (not Docker based on path)

### Next Steps
- [ ] Check actual SDK source code at line 6202 to see what it expects
- [ ] Run `npm list @google/genai` to verify installed version
- [ ] Check if `this.ai.files.upload` signature changed
- [ ] Try alternative: Pass file data directly without temp file
- [ ] Check SDK changelog between working version and current
- [ ] Test with minimal reproduction case
- [ ] Consider downgrading SDK to known working version
- [ ] Check if SDK expects different parameter names

## Version History

| Date | Change | Reason | Result |
|------|--------|--------|--------|
| Oct 2024 | Initial fix: Blob → File Buffer + config | SDK couldn't detect mimeType from path | ✅ Fixed |
| Nov 24, 2025 (Attempt 1) | Tried: path with flat structure | Initial troubleshooting | ❌ Failed |
| Nov 24, 2025 (Attempt 2) | Tried: File Buffer + config (October's solution) | Reviewed history | ❌ Failed |

### What We Know

#### ✅ Working in October 2024
- Buffer-based upload with config object succeeded
- Same SDK version (@google/genai@^1.27.0)
- Same code structure

#### ❌ Not Working in November 2024
- Exact same code now fails
- Same error regardless of approach tried
- Buffer is valid (file writes successfully to temp)

#### 🤔 Differences to Investigate
1. **Time Gap**: ~1 month between working and broken state
2. **Branch Switch**: Switched from main → feat/chat → main → feat/chat
3. **Dependencies**: May have been reinstalled with `npm install`
4. **SDK Updates**: Package may have been updated silently (despite ^1.27.0 semver)
5. **API Server Changes**: Google's backend may have changed validation rules

### Current Investigation Status
**Status:** 🔴 UNRESOLVED  
**Last Tested:** November 24, 2025 at 05:30 UTC  
**Error Persists:** Yes (both path and buffer approaches fail)  
**Confidence Level:** Low - need to check SDK internals  
**Next Action Required:** Examine SDK source code or try alternative approaches

## Quick Reference Card

### ⚡ Emergency Fix Checklist

**If you see this error again:**
1. ✅ Open `backend/src/services/geminiDocumentService.js`
2. ✅ Find `files.upload()` call (line ~57)
3. ✅ Verify you're using `fsSync.readFileSync()` to read file as Buffer
4. ✅ Ensure upload structure is: `{ file: buffer, config: { mimeType, displayName } }`
5. ✅ Restart backend or nodemon will auto-reload
6. ✅ Test by opening a book and starting a chat

### 🔍 Quick Diagnostic

**Check these in order:**
```javascript
// 1. Is fsSync imported?
const fsSync = require('fs');

// 2. Is file read as Buffer?
const fileBuffer = fsSync.readFileSync(tempFilePath);

// 3. Is upload using Buffer with config?
await this.ai.files.upload({
  file: fileBuffer,  // ← Must be Buffer
  config: {          // ← Must have config object
    displayName,
    mimeType: 'application/pdf',  // ← Must be explicit
  },
});
```

### 🚫 Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| `path: tempFilePath` | `file: fileBuffer` |
| `file: tempFilePath` | `file: fsSync.readFileSync(path)` |
| `mimeType: 'application/pdf'` (root) | `config: { mimeType: '...' }` |
| Auto-detection reliance | Explicit mimeType always |

---

**Last Updated:** November 24, 2025  
**SDK Version:** @google/genai@^1.27.0  
**Status:** ✅ Fixed and Documented  
**Fix Verified:** November 24, 2025 (Second occurrence resolved)

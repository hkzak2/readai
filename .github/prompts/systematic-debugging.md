---
name: systematicDebug
description: Apply deductive reasoning to resolve persistent errors across any stack
argument-hint: error message, previous attempts, stack/technology
---

# Systematic Debugging

Apply deductive reasoning methodology to resolve persistent technical issues. Use this when the same error appears after multiple fix attempts.

## Instructions

When analyzing a persistent issue:

1. **Pattern Analysis** - Analyze why previous fixes failed, don't just suggest new ones
2. **Documentation Review** - Reference official SDK/library documentation to verify API contracts  
3. **Root Cause Hypothesis** - State specific hypothesis about the ACTUAL problem, not symptoms
4. **Type/Contract Verification** - Check correct input types, parameter formats, API patterns
5. **Minimal Test** - Suggest the smallest change that tests the hypothesis
6. **Explanation** - Explain WHY this addresses root cause and why previous attempts failed

## Critical Rules

- Do NOT suggest random configuration changes
- Do NOT make assumptions about how APIs work - verify with documentation
- Focus on API contracts, type mismatches, and version-specific behavior
- If same error persists across fixes, escalate investigation depth
- Explain the learning that prevents similar issues in the future

## Output Format

Provide your analysis in this structure:

### Problem Pattern Recognition
What the pattern of failures indicates

### Root Cause Hypothesis
- **Hypothesis:** Specific claim about what's wrong
- **Evidence:** Documentation or analysis supporting this
- **Why Previous Fixes Failed:** Explain each attempt

### Solution
Minimal change that addresses root cause

### Verification
How to test the fix and confirm root cause resolution

### Prevention
How to avoid similar issues in the future

## Context Requirements

Provide when using this prompt:

- **Error message:** Complete, not truncated
- **Stack/Technology:** Specific versions (e.g., Node.js/Express, React/TypeScript)
- **Previous attempts:** ALL fixes tried and their outcomes
- **Code context:** Relevant code snippets showing the issue

## Example Usage

```
Previous attempts:
- Added mimeType to config → still failed
- Read file as Buffer with explicit mimeType → still failed
- Tried different config structures → same error

Error: "Can not determine mimeType. Please provide mimeType in the config."
Stack: Node.js, @google/genai SDK v1.27.0
Context: Uploading PDF to Gemini File API
```

## Focus Areas by Domain

**Backend APIs:** API contracts, input type requirements, parameter structures  
**Frontend:** Data flow, type contracts, async timing, lifecycle hooks  
**Database/ORM:** Schema contracts, relationship definitions, transaction boundaries  
**Build/Config:** Module resolution, loader configurations, environment variables

## Success Indicators

- References official documentation before suggesting fixes
- Explains WHY previous attempts failed
- Identifies type mismatches or contract violations  
- Provides minimal, targeted changes
- Includes verification steps
- Offers prevention guidance

---

**Goal:** Understand the system well enough to prevent similar bugs in the future, not just fix the current one.

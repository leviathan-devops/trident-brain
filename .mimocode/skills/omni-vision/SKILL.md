---
name: omni-vision
description: Use when analyzing images, video, or audio evidence through the omni-vision API-mode pipeline — caller contract for media_context, analysis_goal, output_requirements, and the 50-part per-call budget.
---
# omni-vision caller contract
Api mode only. Every call carries media_context (500+ chars, WHAT/when/where/intent — NEVER contents), analysis_goal (200+ chars), output_requirements (3+ sections). Max 50 media parts per call — split larger sets into sequential calls. Media parts are per-call and never persisted as history; verdicts live in T1 SQLite and the returned text.

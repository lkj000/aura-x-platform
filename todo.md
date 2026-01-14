# AURA-X Platform TODO

## Phase 6: Full-Stack Upgrade
- [x] Upgrade to web-db-user template
- [x] Resolve TypeScript version conflicts
- [x] Restore DAW components after template merge
- [ ] Test authentication flow

## Phase 7: Audio Engine Implementation
- [ ] Integrate Tone.js for real-time playback
- [ ] Implement audio sample loading
- [ ] Connect piano roll to audio engine
- [ ] Add transport controls (play/pause/stop)

## Phase 8: Modal.com AI Backend Integration
- [ ] Create API proxy endpoints in server
- [ ] Connect to Modal.com functions
- [ ] Implement music generation workflow
- [ ] Implement stem separation workflow
- [ ] Add real-time progress updates

## Phase 9: Level 5 Agent Features
- [ ] Implement autonomous instrument suggestion
- [ ] Add cultural authenticity scoring
- [ ] Create AI-powered mixing assistant
- [ ] Add humanization engine
- [ ] Implement loop variation generator

## Immediate Implementation Tasks

### Audio Engine (Tone.js)
- [x] Install and configure Tone.js
- [x] Create AudioEngine service class
- [x] Implement transport controls (play/pause/stop)
- [x] Add audio sample loading and caching
- [x] Connect Piano Roll to audio scheduling
- [x] Add metronome and click track

### Modal.com Integration
- [ ] Create server-side API proxy endpoints
- [ ] Implement music generation workflow
- [ ] Implement stem separation workflow
- [ ] Add real-time progress tracking via WebSocket
- [ ] Handle file uploads to S3
- [ ] Add error handling and retry logic

### Project Persistence
- [ ] Design database schema for projects and tracks
- [ ] Create tRPC procedures for CRUD operations
- [ ] Implement auto-save functionality
- [ ] Add project browser/manager UI
- [ ] Implement export functionality

## Current Implementation Phase

### Modal.com AI Integration
- [x] Create Modal API client service
- [ ] Add Modal endpoint URLs to environment variables
- [x] Implement music generation API call
- [ ] Implement stem separation API call
- [ ] Implement mastering API call
- [ ] Add webhook handler for async results
- [ ] Test end-to-end generation flow

### Projects Management UI
- [x] Create Projects page component
- [x] Add project list view with cards
- [x] Implement project creation modal
- [x] Add project deletion with confirmation
- [ ] Implement auto-save functionality
- [ ] Add project export/import features

### Amapiano Sample Integration
- [ ] Research and source authentic Amapiano samples
- [ ] Create sample library structure
- [ ] Implement sample loader service
- [ ] Add log drum samples
- [ ] Add shaker samples
- [ ] Add chord/piano samples
- [ ] Add saxophone samples
- [ ] Test playback with real samples

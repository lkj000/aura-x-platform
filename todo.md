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

## Critical: Reproducibility & Determinism

### Seed Control & Parameter Versioning
- [ ] Add seed parameter to all generation endpoints
- [ ] Implement parameter snapshot system
- [ ] Create generation history with exact parameters
- [ ] Add "Regenerate with same settings" button
- [ ] Store model version info with each generation
- [ ] Implement parameter diff viewer

### Modal Configuration UI
- [x] Create Settings page component
- [x] Add Modal endpoint configuration form
- [ ] Implement environment variable management
- [ ] Add connection testing functionality
- [ ] Create API key secure storage

### Auto-Save Implementation
- [x] Add useInterval hook for periodic saves
- [x] Implement project state serialization
- [ ] Add "Saving..." indicator in UI
- [ ] Handle offline/error scenarios
- [ ] Add manual save trigger
- [ ] Implement save conflict resolution

### Sample Pack Management
- [x] Create sample library database schema
- [ ] Build sample upload/import UI
- [ ] Implement sample categorization system
- [ ] Add sample preview player
- [ ] Create sample pack versioning
- [ ] Build sample search and filtering


## Current Sprint: Complete Sample & Plugin System

### Sample Upload UI
- [x] Create SampleUpload component with drag-and-drop
- [x] Implement file validation (format, size)
- [x] Add automatic metadata extraction (BPM, key, duration)
- [ ] Build waveform generation service
- [x] Create batch upload progress indicator
- [x] Add sample pack creation workflow

### Seed Control & Reproducibility
- [x] Add seed input field to generation UI
- [x] Implement seed locking mechanism
- [x] Create "Regenerate with same settings" button
- [x] Build parameter snapshot viewer
- [ ] Add generation history panel
- [ ] Implement parameter comparison tool

### Sample Browser Component
- [ ] Create SampleBrowser component
- [ ] Implement search and filtering
- [ ] Add category-based navigation
- [ ] Build sample preview player
- [ ] Implement drag-to-timeline functionality
- [ ] Add favorites system
- [ ] Create recent samples history

### Plugin Management & Failure Handling
- [ ] Create plugin registry system
- [ ] Implement plugin health checking
- [ ] Add graceful fallback mechanisms
- [ ] Build plugin error reporting
- [ ] Create alternative processing chains
- [ ] Add plugin version tracking
- [ ] Implement plugin dependency resolution


## Current Implementation: Sample Browser, History & Modal Integration

### Sample Browser Component (Completed)
- [x] Create SampleBrowser component with grid/list view
- [x] Implement search and filtering by category/BPM/key
- [x] Add waveform preview visualization
- [x] Build inline audio preview player
- [x] Implement drag-to-timeline functionality
- [x] Add favorites/starred samples system
- [ ] Create sample tagging system

### Generation History Panel (Completed)
- [x] Create GenerationHistory component
- [x] Design history database schema
- [x] Implement history persistence via tRPC
- [x] Add one-click reproduction functionality
- [x] Build parameter comparison view
- [ ] Add history search and filtering
- [ ] Implement history export/import

### Modal.com Endpoint Integration (Completed)
- [x] Update Settings page with Modal endpoint configuration
- [x] Create tRPC procedures for Modal API calls
- [x] Implement music generation endpoint
- [x] Implement stem separation endpoint
- [x] Implement mastering endpoint
- [x] Add connection testing functionality
- [ ] Build error handling and retry logic


## New Implementation: DAW Integration & Training Pipeline

### DAW Component Integration
- [x] Add Sample Browser as resizable sidebar panel in Studio page
- [x] Add Generation History as collapsible drawer in Studio page
- [x] Implement drag-and-drop from Sample Browser to Timeline
- [x] Connect sample selection to audio engine playback
- [x] Add keyboard shortcuts for panel toggling (floating buttons)
- [ ] Implement panel state persistence

### Modal Deployment & Testing
- [x] Create Modal deployment script with environment setup
- [x] Add connection testing for all three endpoints
- [ ] Implement retry logic and error handling
- [x] Create health check monitoring
- [ ] Add deployment status dashboard
- [x] Document deployment process

### Suno Training Data Pipeline
- [x] Create Suno API integration for bulk generation
- [x] Implement prompt templates for Amapiano subgenres
- [x] Build batch generation workflow (100-1000 samples)
- [x] Add automatic file download and storage
- [x] Create metadata extraction and tagging
- [x] Implement quality filtering and validation
- [x] Build training dataset organization structure


## New Implementation: DAW Integration & Training Pipeline

### DAW Component Integration
- [x] Add Sample Browser as resizable sidebar panel in Studio page
- [x] Add Generation History as collapsible drawer in Studio page
- [x] Implement drag-and-drop from Sample Browser to Timeline
- [x] Connect sample selection to audio engine playback
- [x] Add keyboard shortcuts for panel toggling (floating buttons)
- [ ] Implement panel state persistence

### Modal Deployment & Testing
- [x] Create Modal deployment script with environment setup
- [x] Add connection testing for all three endpoints
- [ ] Implement retry logic and error handling
- [x] Create health check monitoring
- [ ] Add deployment status dashboard
- [x] Document deployment process

### Suno Training Data Pipeline
- [x] Create Suno API integration for bulk generation
- [x] Implement prompt templates for Amapiano subgenres
- [x] Build batch generation workflow (100-1000 samples)
- [x] Add automatic file download and storage
- [x] Create metadata extraction and tagging
- [x] Implement quality filtering and validation
- [x] Build training dataset organization structure


## Generation → DAW Workflow Implementation

### Phase 1: Instruments Page - Real AI Generation
- [x] Connect Instruments page to Modal music generation endpoint
- [x] Implement real-time generation progress tracking
- [x] Add audio preview playback with waveform visualization
- [x] Implement download to media library functionality
- [x] Add generation parameter persistence
- [x] Build error handling and retry logic

### Phase 2: Media Library Storage
- [ ] Implement S3 upload for generated audio
- [ ] Create media library database records
- [ ] Build media library UI component
- [ ] Add audio file metadata extraction
- [ ] Implement search and filtering
- [ ] Add download functionality

### Phase 3: Studio Timeline - Audio Import & Playback
- [ ] Implement drag-and-drop from media library to timeline
- [ ] Create audio clip rendering on timeline
- [ ] Connect to AudioEngine for real playback
- [ ] Build transport controls (play/pause/stop)
- [ ] Add waveform visualization for clips
- [ ] Implement timeline scrolling and zooming

### Phase 4: Audio Editing
- [ ] Implement clip selection and multi-select
- [ ] Add clip movement with snapping
- [ ] Build clip trimming (start/end)
- [ ] Implement volume/gain control per clip
- [ ] Add fade in/fade out
- [ ] Build undo/redo system

### Phase 5: Audio Export
- [ ] Implement mix-down to single audio file
- [ ] Add export format selection (WAV/MP3)
- [ ] Build export progress tracking
- [ ] Implement download functionality
- [ ] Add export to media library option

### Phase 6: End-to-End Testing
- [ ] Test complete workflow from generation to export
- [ ] Verify audio quality throughout pipeline
- [ ] Test error handling and edge cases
- [ ] Validate performance under load
- [ ] Document workflow for users


## Completing Generation → DAW Workflow (Current)

### Timeline Audio Playback Implementation
- [x] Implement drag-and-drop from media library to timeline
- [x] Create audio clip rendering on timeline canvas
- [x] Connect AudioEngine for real Web Audio API playback
- [x] Build transport controls (play/pause/stop/rewind)
- [x] Add clip selection and manipulation
- [x] Implement waveform visualization for clips
- [x] Add timeline scrolling and zooming
- [ ] Build clip trimming functionality
- [x] Implement volume control per clip
- [ ] Add fade in/fade out controls

### Modal Deployment
- [ ] Configure Modal API keys in environment
- [ ] Deploy MusicGen endpoint
- [ ] Deploy Demucs stem separation endpoint
- [ ] Deploy mastering endpoint
- [ ] Test all endpoints with real requests
- [ ] Update frontend to use production endpoints

### Audio Export
- [ ] Implement mix-down engine using Web Audio API
- [ ] Add export format selection (WAV/MP3)
- [ ] Build export progress UI
- [ ] Implement download functionality
- [ ] Add export to media library option
- [ ] Test export quality and integrity


## Bug Fixes (Current)
- [x] Remove placeholder Tone.js sample loading code causing external URL errors
- [x] Clean up mock data in Home.tsx


## Timeline Integration with Real Samples (Current)
- [x] Upload Amapiano samples to S3 storage
- [x] Create media library database records for samples
- [x] Replace Timeline component with TimelineV2 in Home.tsx
- [x] Connect transport controls to AudioEngine.playTimeline()
- [x] Wire up play/pause/stop buttons
- [x] Connect Sample Browser to real database
- [ ] Test drag-and-drop from Sample Browser to Timeline
- [ ] Test audio playback with real Amapiano samples
- [ ] Verify clip manipulation (move, delete, volume)


## Bug Fixes (Current)
- [x] Fix missing key prop in SampleBrowser list rendering


## Level 5 Autonomous Agent Implementation

### Phase 1: Audio Export Functionality
- [x] Implement Web Audio API OfflineAudioContext for mix-down
- [x] Add WAV export functionality
- [x] Add MP3 export functionality (with encoding)
- [x] Create export UI in Studio page
- [ ] Upload exported tracks to S3
- [x] Add download links to media library
- [x] Implement export progress tracking

### Phase 2: Deterministic Inference & Creative/Production Modes
- [ ] Add Creative/Production mode toggle to Instruments page
- [ ] Update Modal deployment with torch.use_deterministic_algorithms(True)
- [ ] Implement track hash (SHA256) in generation history
- [ ] Add replay API endpoint to tRPC router
- [ ] Update generation form to respect mode selection
- [ ] Add mode indicator in generation history

### Phase 3: LangChain Orchestration Agent (Python Backend)
- [ ] Create Python FastAPI backend for orchestration
- [ ] Integrate LangChain with agent framework
- [ ] Define tool: generate_music()
- [ ] Define tool: separate_stems()
- [ ] Define tool: apply_mastering()
- [ ] Define tool: export_track()
- [ ] Implement agent prompt handling
- [ ] Add agent progress tracking
- [ ] Create agent UI in Instruments page
- [ ] Connect frontend to Python orchestration backend
- [ ] Deploy orchestration backend to Modal

### Phase 4: Quality Scoring & Analysis
- [ ] Implement spectral analysis in Analysis page
- [ ] Add LUFS meter with compliance checking
- [ ] Build cultural authenticity scoring for Amapiano
- [ ] Add genre similarity detection
- [ ] Surface quality metrics in generation history
- [ ] Create quality dashboard in Analysis page
- [ ] Implement automated quality feedback loop

### Phase 5: Advanced Mastering Pipeline
- [ ] Enhance Modal mastering with EQ
- [ ] Add compression to mastering pipeline
- [ ] Implement stereo imaging
- [ ] Add loudness normalization (LUFS targeting)
- [ ] Create Amapiano subgenre presets
- [ ] Add mastering preview in Studio
- [ ] Implement mastering parameter controls

### Phase 6: Observability & Monitoring
- [ ] Add Prometheus metrics to Modal endpoints
- [ ] Build Grafana dashboard for GPU utilization
- [ ] Add latency tracking
- [ ] Implement LUFS monitoring
- [ ] Add error tracking and logging
- [ ] Create usage analytics dashboard


## Critical Bug Fix (Current)
- [x] Fix invalid hook call error in TimelineV2.tsx (calling trpc.useQuery outside component)

## Level 5 Autonomous Agent - Remaining Implementation
- [x] Implement real quality scoring with pyloudnorm (LUFS measurement)
- [x] Add spectral analysis with librosa
- [x] Create cultural authenticity scoring algorithm
- [ ] Deploy orchestration agent to production
- [ ] Add autonomous mode toggle in Instruments page
- [ ] Connect frontend to orchestration agent API
- [ ] Test complete Level 5 autonomous workflow


## Critical Bug Fix + Follow-ups (Current)
- [x] Fix generate.status 500 error (generationId: 0 causing backend failure)
- [x] Add autonomous mode toggle to Instruments page
- [x] Deploy quality scoring service on port 8001
- [x] Create Analysis page with quality score visualization
- [ ] Test complete autonomous workflow end-to-end


## Backend Deployment & CORS Fix (Current)
- [x] Fix CORS error in waveform loading (external URL blocked)
- [x] Use S3-hosted Amapiano sample instead of external URL
- [x] Deploy orchestration agent on port 8000
- [x] Deploy quality scoring service on port 8001
- [ ] Configure Modal API keys (MODAL_API_KEY, MODAL_BASE_URL)
- [ ] Deploy Modal AI endpoints (modal deploy modal_deploy.py)
- [ ] Test complete autonomous workflow end-to-end


## Modal AI Endpoints Deployment (Current)
- [x] Configure MODAL_API_KEY environment variable
- [x] Configure MODAL_BASE_URL environment variable
- [ ] Deploy modal_deploy.py to Modal.com
- [ ] Test MusicGen generation endpoint
- [ ] Test Demucs stem separation endpoint
- [ ] Test mastering endpoint
- [ ] Test complete autonomous workflow with real AI generation

## Follow-up Tasks (Session 2)
- [x] Implement drag-and-drop from Sample Browser to Timeline with drop zone handlers
- [x] Test quality analysis workflow end-to-end with uploaded Amapiano samples
- [x] Upgrade Modal plan to enable AI endpoint deployment (stopped amapianoriz app)
- [x] Deploy Modal AI endpoints (deployed at https://mabgwej--aura-x-ai-fastapi-app.modal.run)
- [x] Test complete autonomous workflow from generation to quality analysis

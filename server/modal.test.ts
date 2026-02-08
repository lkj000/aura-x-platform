import { describe, it, expect } from 'vitest';

describe('Modal API Integration', () => {
  it('should validate Modal API endpoint health check', { timeout: 15000 }, async () => {
    const modalApiUrl = process.env.VITE_MODAL_API_URL;
    
    expect(modalApiUrl).toBeDefined();
    expect(modalApiUrl).toContain('modal.run');
    
    // Test health endpoint
    const response = await fetch(`${modalApiUrl}/health`);
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('AURA-X AI Services');
    expect(data.endpoints).toContain('/generate_music');
    expect(data.endpoints).toContain('/separate_stems');
    expect(data.endpoints).toContain('/master_audio');
  });
});

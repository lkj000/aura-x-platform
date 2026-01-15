import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('Modal AI Endpoint Health Check', () => {
  it('should successfully connect to Modal health endpoint', async () => {
    const modalBaseUrl = process.env.MODAL_BASE_URL || 'https://mabgwej--aura-x-ai-fastapi-app.modal.run';
    
    const response = await axios.get(`${modalBaseUrl}/health`, {
      timeout: 10000,
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
    expect(response.data.status).toBe('healthy');
    expect(response.data).toHaveProperty('endpoints');
    expect(response.data.endpoints).toContain('/generate_music');
    expect(response.data.endpoints).toContain('/separate_stems');
    expect(response.data.endpoints).toContain('/master_audio');
  }, 15000); // 15 second timeout for network request
});

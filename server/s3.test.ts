import { describe, it, expect } from 'vitest';
import { storagePut } from './storage';

describe('S3 Credentials Validation', () => {
  it('should successfully upload a test file to S3', async () => {
    // Create a small test file
    const testData = Buffer.from('AURA-X S3 Test File');
    const testKey = `test-uploads/s3-validation-${Date.now()}.txt`;
    
    // Attempt to upload to S3
    const result = await storagePut(testKey, testData, 'text/plain');
    
    // Verify upload succeeded
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.url).toContain('s3');
    expect(result.key).toBe(testKey);
    
    console.log('✅ S3 credentials validated successfully');
    console.log('📦 Test file uploaded to:', result.url);
  }, 30000); // 30 second timeout for S3 upload
});

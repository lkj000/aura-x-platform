import { storagePut } from './server/storage.js';
import * as db from './server/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const samples = [
  {
    path: '/home/ubuntu/upload/Intro(Ad-libs)(1).mp3',
    name: 'Intro Ad-libs 1',
    category: 'vocal',
    bpm: 112,
    key: 'F min',
    tags: ['amapiano', 'vocal', 'intro', 'ad-libs'],
  },
  {
    path: '/home/ubuntu/upload/Intro(Ad-libs).mp3',
    name: 'Intro Ad-libs 2',
    category: 'vocal',
    bpm: 112,
    key: 'F min',
    tags: ['amapiano', 'vocal', 'intro', 'ad-libs'],
  },
  {
    path: '/home/ubuntu/upload/__🎶AMAPIANOLOVE–XHOSALYRICS(KASI.mp3',
    name: 'Amapiano Love - Xhosa Lyrics (Kasi)',
    category: 'vocal',
    bpm: 112,
    key: 'F min',
    tags: ['amapiano', 'vocal', 'xhosa', 'kasi', 'love'],
  },
];

async function seedSamples() {
  console.log('🎵 Seeding Amapiano samples...\n');

  for (const sample of samples) {
    try {
      console.log(`Processing: ${sample.name}`);
      
      // Read file
      const fileBuffer = fs.readFileSync(sample.path);
      const fileSize = fileBuffer.length;
      
      // Generate S3 key with random suffix to prevent enumeration
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileName = path.basename(sample.path, '.mp3');
      const s3Key = `samples/${fileName}-${randomSuffix}.mp3`;
      
      // Upload to S3
      console.log('  ↑ Uploading to S3...');
      const { url, key } = await storagePut(s3Key, fileBuffer, 'audio/mpeg');
      console.log(`  ✓ Uploaded: ${url}`);
      
      // Create media library record
      console.log('  ↓ Creating database record...');
      const mediaRecord = await db.createMediaLibraryItem({
        name: sample.name,
        type: 'audio',
        fileUrl: url,
        fileKey: key,
        fileSize,
        mimeType: 'audio/mpeg',
        category: sample.category,
        bpm: sample.bpm,
        key: sample.key,
        tags: JSON.stringify(sample.tags),
        userId: 1, // Owner
      });
      
      console.log(`  ✓ Created record ID: ${mediaRecord.id}\n`);
      
    } catch (error) {
      console.error(`  ✗ Failed to process ${sample.name}:`, error.message);
      console.error(error);
    }
  }
  
  console.log('✅ Sample seeding complete!');
  process.exit(0);
}

seedSamples().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});

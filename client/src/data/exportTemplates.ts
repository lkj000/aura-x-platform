export interface ExportTemplate {
  id: string;
  name: string;
  platform: string;
  icon: string;
  description: string;
  settings: {
    format: 'wav' | 'mp3' | 'flac' | 'aac';
    sampleRate: number;
    bitDepth?: 16 | 24 | 32;
    bitrate?: number; // For lossy formats
    targetLUFS: number;
    ceiling: number; // dBTP
    normalize: boolean;
    metadata: {
      includeArtwork: boolean;
      includeISRC: boolean;
      includeLyrics: boolean;
    };
  };
  recommendations: string[];
}

export const exportTemplates: ExportTemplate[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    platform: 'spotify',
    icon: '🎵',
    description: 'Optimized for Spotify streaming with -14 LUFS normalization',
    settings: {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 16,
      targetLUFS: -14,
      ceiling: -1,
      normalize: true,
      metadata: {
        includeArtwork: true,
        includeISRC: true,
        includeLyrics: false,
      },
    },
    recommendations: [
      'Spotify normalizes to -14 LUFS by default',
      'Use -1 dBTP ceiling to prevent clipping',
      'WAV 16-bit/44.1kHz is recommended for best quality',
      'Include ISRC code for royalty tracking',
      'Avoid excessive limiting - let Spotify handle normalization',
    ],
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    platform: 'soundcloud',
    icon: '☁️',
    description: 'Optimized for SoundCloud with -13 LUFS for competitive loudness',
    settings: {
      format: 'mp3',
      sampleRate: 48000,
      bitrate: 320,
      targetLUFS: -13,
      ceiling: -0.5,
      normalize: true,
      metadata: {
        includeArtwork: true,
        includeISRC: false,
        includeLyrics: false,
      },
    },
    recommendations: [
      'SoundCloud uses -13 LUFS normalization',
      'MP3 320kbps is sufficient for streaming',
      '48kHz sample rate matches SoundCloud processing',
      'Slightly louder masters work well on this platform',
      'Include high-quality artwork (min 800x800px)',
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    platform: 'youtube',
    icon: '📺',
    description: 'Optimized for YouTube with -13 to -15 LUFS range',
    settings: {
      format: 'wav',
      sampleRate: 48000,
      bitDepth: 24,
      targetLUFS: -14,
      ceiling: -1,
      normalize: true,
      metadata: {
        includeArtwork: true,
        includeISRC: false,
        includeLyrics: true,
      },
    },
    recommendations: [
      'YouTube normalizes to -14 LUFS',
      'Use 48kHz for video sync compatibility',
      '24-bit depth provides headroom for processing',
      'Include lyrics for better engagement',
      'Louder than -14 LUFS will be turned down',
    ],
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    platform: 'apple-music',
    icon: '🍎',
    description: 'Optimized for Apple Music with -16 LUFS (Sound Check)',
    settings: {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 24,
      targetLUFS: -16,
      ceiling: -1,
      normalize: true,
      metadata: {
        includeArtwork: true,
        includeISRC: true,
        includeLyrics: true,
      },
    },
    recommendations: [
      'Apple Music uses Sound Check at -16 LUFS',
      'More dynamic masters sound better on this platform',
      'Include high-res artwork (3000x3000px recommended)',
      'ISRC codes are important for Apple Music',
      'Lyrics enhance user experience significantly',
    ],
  },
  {
    id: 'tidal',
    name: 'Tidal',
    platform: 'tidal',
    icon: '🌊',
    description: 'Optimized for Tidal HiFi with -14 LUFS and lossless quality',
    settings: {
      format: 'flac',
      sampleRate: 48000,
      bitDepth: 24,
      targetLUFS: -14,
      ceiling: -1,
      normalize: true,
      metadata: {
        includeArtwork: true,
        includeISRC: true,
        includeLyrics: true,
      },
    },
    recommendations: [
      'Tidal supports lossless FLAC for HiFi tier',
      'Use 24-bit/48kHz for maximum quality',
      'Dynamic range is preserved and appreciated',
      'Include all metadata for best presentation',
      'Audiophile audience values quality over loudness',
    ],
  },
  {
    id: 'mastering',
    name: 'Mastering Archive',
    platform: 'mastering',
    icon: '🎚️',
    description: 'Uncompressed master for archival and future mastering',
    settings: {
      format: 'wav',
      sampleRate: 48000,
      bitDepth: 32,
      targetLUFS: -18,
      ceiling: -3,
      normalize: false,
      metadata: {
        includeArtwork: false,
        includeISRC: false,
        includeLyrics: false,
      },
    },
    recommendations: [
      'Keep headroom for mastering engineer',
      '32-bit float provides maximum dynamic range',
      'No normalization - preserve original dynamics',
      '-3 dBTP ceiling leaves room for processing',
      'This is your archival master - keep it safe',
    ],
  },
  {
    id: 'club-dj',
    name: 'Club/DJ',
    platform: 'club-dj',
    icon: '🎧',
    description: 'Loud master for club systems and DJ sets (-8 to -10 LUFS)',
    settings: {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 16,
      targetLUFS: -9,
      ceiling: -0.3,
      normalize: true,
      metadata: {
        includeArtwork: false,
        includeISRC: false,
        includeLyrics: false,
      },
    },
    recommendations: [
      'Club systems need competitive loudness',
      'Heavy limiting is expected for this use case',
      'Bass energy should be prominent but controlled',
      'Test on large speakers before finalizing',
      'Consider separate radio edit at -14 LUFS',
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    platform: 'instagram',
    icon: '📸',
    description: 'Optimized for Instagram Reels and Stories',
    settings: {
      format: 'aac',
      sampleRate: 44100,
      bitrate: 192,
      targetLUFS: -14,
      ceiling: -1,
      normalize: true,
      metadata: {
        includeArtwork: false,
        includeISRC: false,
        includeLyrics: false,
      },
    },
    recommendations: [
      'Instagram heavily compresses audio',
      'AAC 192kbps is optimal for mobile',
      'Keep it punchy and attention-grabbing',
      'First 3 seconds are crucial for engagement',
      'Test on phone speakers before posting',
    ],
  },
];

export function getTemplateById(id: string): ExportTemplate | undefined {
  return exportTemplates.find(t => t.id === id);
}

export function getTemplatesByPlatform(platform: string): ExportTemplate[] {
  return exportTemplates.filter(t => t.platform === platform);
}

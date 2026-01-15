import { describe, it, expect, beforeEach } from 'vitest';
import { AddAudioClipCommand, DeleteAudioClipCommand, UpdateClipPositionCommand } from '../client/src/services/UndoRedoManager';

describe('Timeline Undo/Redo Integration', () => {
  describe('AddAudioClipCommand', () => {
    it('should execute add clip command', async () => {
      let clipId: number | null = null;
      
      const command = new AddAudioClipCommand(
        {
          trackId: 1,
          name: 'Test Clip',
          fileUrl: 'https://example.com/audio.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1.0,
        },
        async (data) => {
          clipId = 123;
          return clipId;
        },
        async (id) => {
          clipId = null;
        }
      );

      await command.execute();
      expect(clipId).toBe(123);
      expect(command.description).toBe('Add clip: Test Clip');
    });

    it('should undo add clip command', async () => {
      let clipId: number | null = null;
      
      const command = new AddAudioClipCommand(
        {
          trackId: 1,
          name: 'Test Clip',
          fileUrl: 'https://example.com/audio.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1.0,
        },
        async (data) => {
          clipId = 123;
          return clipId;
        },
        async (id) => {
          clipId = null;
        }
      );

      await command.execute();
      expect(clipId).toBe(123);

      await command.undo();
      expect(clipId).toBeNull();
    });
  });

  describe('UpdateClipPositionCommand', () => {
    it('should execute update position command', async () => {
      let currentPosition = 0;
      
      const command = new UpdateClipPositionCommand(
        123,
        0,
        5.5,
        async (id, position) => {
          currentPosition = position;
        }
      );

      await command.execute();
      expect(currentPosition).toBe(5.5);
      expect(command.description).toBe('Move clip');
    });

    it('should undo update position command', async () => {
      let currentPosition = 0;
      
      const command = new UpdateClipPositionCommand(
        123,
        0,
        5.5,
        async (id, position) => {
          currentPosition = position;
        }
      );

      await command.execute();
      expect(currentPosition).toBe(5.5);

      await command.undo();
      expect(currentPosition).toBe(0);
    });
  });

  describe('DeleteAudioClipCommand', () => {
    it('should execute delete clip command', async () => {
      let clipExists = true;
      let clipData: any = null;
      
      const command = new DeleteAudioClipCommand(
        123,
        async (data) => {
          clipExists = true;
          clipData = data;
          return 123;
        },
        async (id) => {
          clipExists = false;
        },
        async (id) => ({
          trackId: 1,
          name: 'Test Clip',
          fileUrl: 'https://example.com/audio.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1.0,
        })
      );

      await command.execute();
      expect(clipExists).toBe(false);
      expect(command.description).toBe('Delete clip');
    });

    it('should undo delete clip command', async () => {
      let clipExists = true;
      let clipData: any = null;
      
      const command = new DeleteAudioClipCommand(
        123,
        async (data) => {
          clipExists = true;
          clipData = data;
          return 123;
        },
        async (id) => {
          clipExists = false;
        },
        async (id) => ({
          trackId: 1,
          name: 'Test Clip',
          fileUrl: 'https://example.com/audio.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1.0,
        })
      );

      await command.execute();
      expect(clipExists).toBe(false);

      await command.undo();
      expect(clipExists).toBe(true);
      expect(clipData).toBeDefined();
      expect(clipData.name).toBe('Test Clip');
    });
  });

  describe('Timeline Integration', () => {
    it('should handle multiple clip operations in sequence', async () => {
      const clips: Map<number, any> = new Map();
      let nextId = 1;

      // Add clip 1
      const addCommand1 = new AddAudioClipCommand(
        {
          trackId: 1,
          name: 'Clip 1',
          fileUrl: 'https://example.com/audio1.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1.0,
        },
        async (data) => {
          const id = nextId++;
          clips.set(id, { id, ...data });
          return id;
        },
        async (id) => {
          clips.delete(id);
        }
      );

      await addCommand1.execute();
      expect(clips.size).toBe(1);

      // Add clip 2
      const addCommand2 = new AddAudioClipCommand(
        {
          trackId: 1,
          name: 'Clip 2',
          fileUrl: 'https://example.com/audio2.mp3',
          startTime: 10,
          duration: 10,
          offset: 0,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1.0,
        },
        async (data) => {
          const id = nextId++;
          clips.set(id, { id, ...data });
          return id;
        },
        async (id) => {
          clips.delete(id);
        }
      );

      await addCommand2.execute();
      expect(clips.size).toBe(2);

      // Undo last add
      await addCommand2.undo();
      expect(clips.size).toBe(1);

      // Undo first add
      await addCommand1.undo();
      expect(clips.size).toBe(0);
    });
  });
});

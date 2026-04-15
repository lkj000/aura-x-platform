import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe.skipIf(!process.env.DATABASE_URL)('Project Collaboration', () => {
  let testUserId1: number;
  let testUserId2: number;
  let testProjectId: number;
  let invitationToken: string;

  beforeAll(async () => {
    // Use test user IDs
    testUserId1 = 1; // Owner
    testUserId2 = 2; // Collaborator
    testProjectId = 1; // Test project
  });

  it('should create a project invitation', async () => {
    invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await db.createProjectInvitation({
      projectId: testProjectId,
      inviterUserId: testUserId1,
      inviteeEmail: 'collaborator@test.com',
      inviteeUserId: testUserId2,
      role: 'editor',
      token: invitationToken,
      expiresAt,
    });

    expect(invitation).toBeDefined();
    expect(invitation.token).toBe(invitationToken);
    expect(invitation.role).toBe('editor');
    expect(invitation.status).toBe('pending');
  });

  it('should retrieve invitation by token', async () => {
    const invitation = await db.getProjectInvitationByToken(invitationToken);
    
    expect(invitation).toBeDefined();
    expect(invitation?.token).toBe(invitationToken);
    expect(invitation?.projectId).toBe(testProjectId);
  });

  it('should accept invitation and add collaborator', async () => {
    // Accept invitation
    const invitation = await db.getProjectInvitationByToken(invitationToken);
    if (!invitation) throw new Error('Invitation not found');

    await db.acceptProjectInvitation(invitation.id);

    // Add as collaborator
    await db.addProjectCollaborator({
      projectId: testProjectId,
      userId: testUserId2,
      role: 'editor',
      invitedBy: testUserId1,
      status: 'accepted',
      acceptedAt: new Date(),
    });

    // Verify collaborator was added
    const collaborators = await db.getProjectCollaborators(testProjectId);
    expect(collaborators.length).toBeGreaterThan(0);
    expect(collaborators.some(c => c.userId === testUserId2)).toBe(true);
  });

  it('should get user role in project', async () => {
    const role = await db.getUserProjectRole(testUserId2, testProjectId);
    
    expect(role).toBe('editor');
  });

  it('should log project activity', async () => {
    await db.logProjectActivity({
      projectId: testProjectId,
      userId: testUserId2,
      action: 'updated',
      entityType: 'track',
      entityId: 1,
      details: { name: 'Updated track name' },
    });

    const activity = await db.getProjectActivity(testProjectId, 10);
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0]?.action).toBe('updated');
  });

  it('should list pending invitations for user', async () => {
    const pendingInvitations = await db.getPendingInvitations(testUserId2);
    
    expect(Array.isArray(pendingInvitations)).toBe(true);
    // Note: May be empty if invitation was already accepted
  });
});

describe('Export Templates', () => {
  it('should have valid export templates', async () => {
    const { exportTemplates } = await import('../client/src/data/exportTemplates');
    
    expect(exportTemplates.length).toBeGreaterThan(0);
    
    // Verify each template has required fields
    exportTemplates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.platform).toBeDefined();
      expect(template.settings).toBeDefined();
      expect(template.settings.format).toBeDefined();
      expect(template.settings.targetLUFS).toBeDefined();
      expect(template.settings.ceiling).toBeDefined();
      expect(template.recommendations).toBeDefined();
      expect(Array.isArray(template.recommendations)).toBe(true);
    });
  });

  it('should have Spotify template with correct LUFS', async () => {
    const { exportTemplates } = await import('../client/src/data/exportTemplates');
    const spotify = exportTemplates.find(t => t.id === 'spotify');
    
    expect(spotify).toBeDefined();
    expect(spotify?.settings.targetLUFS).toBe(-14);
    expect(spotify?.settings.format).toBe('wav');
  });

  it('should have SoundCloud template with correct settings', async () => {
    const { exportTemplates } = await import('../client/src/data/exportTemplates');
    const soundcloud = exportTemplates.find(t => t.id === 'soundcloud');
    
    expect(soundcloud).toBeDefined();
    expect(soundcloud?.settings.targetLUFS).toBe(-13);
    expect(soundcloud?.settings.format).toBe('mp3');
  });

  it('should have YouTube template with correct settings', async () => {
    const { exportTemplates } = await import('../client/src/data/exportTemplates');
    const youtube = exportTemplates.find(t => t.id === 'youtube');
    
    expect(youtube).toBeDefined();
    expect(youtube?.settings.targetLUFS).toBe(-14);
    expect(youtube?.settings.sampleRate).toBe(48000);
  });
});

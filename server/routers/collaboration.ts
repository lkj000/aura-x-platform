/**
 * collaboration.ts — Project collaboration router
 *
 * Covers: invitations, roles, activity log, pending invites.
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const collaborationRouter = router({
  listCollaborators: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return db.getProjectCollaborators(input.projectId);
    }),

  invite: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      inviteeEmail: z.string().email(),
      role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
    }))
    .mutation(async ({ ctx, input }) => {
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await db.createProjectInvitation({
        projectId: input.projectId,
        inviterUserId: ctx.user.id,
        inviteeEmail: input.inviteeEmail,
        role: input.role,
        token,
        expiresAt,
      });

      await db.logProjectActivity({
        projectId: input.projectId,
        userId: ctx.user.id,
        action: "invited",
        entityType: "collaborator",
        details: { email: input.inviteeEmail, role: input.role },
      });

      return { invitation, inviteUrl: `/invite/${token}` };
    }),

  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await db.getProjectInvitationByToken(input.token);

      if (!invitation) throw new Error("Invitation not found");
      if (invitation.status !== "pending") throw new Error("Invitation already processed");
      if (new Date() > new Date(invitation.expiresAt)) throw new Error("Invitation expired");

      await db.addProjectCollaborator({
        projectId: invitation.projectId,
        userId: ctx.user.id,
        role: invitation.role,
        invitedBy: invitation.inviterUserId,
        status: "accepted",
        acceptedAt: new Date(),
      });

      await db.acceptProjectInvitation(invitation.id);

      await db.logProjectActivity({
        projectId: invitation.projectId,
        userId: ctx.user.id,
        action: "joined",
        entityType: "collaborator",
        details: { role: invitation.role },
      });

      return { success: true, projectId: invitation.projectId };
    }),

  updateRole: protectedProcedure
    .input(z.object({
      collabId: z.number(),
      role: z.enum(["owner", "admin", "editor", "viewer"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateCollaboratorRole(input.collabId, input.role);
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ collabId: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeProjectCollaborator(input.collabId);
      return { success: true };
    }),

  getActivity: protectedProcedure
    .input(z.object({ projectId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return db.getProjectActivity(input.projectId, input.limit);
    }),

  getPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
    return db.getPendingInvitations(ctx.user.id);
  }),

  getRole: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getUserProjectRole(ctx.user.id, input.projectId);
    }),
});

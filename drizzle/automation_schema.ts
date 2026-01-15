import { mysqlTable, int, varchar, text, timestamp, float, boolean } from 'drizzle-orm/mysql-core';

/**
 * Automation Lanes Schema
 * Stores automation data for dynamic parameter control over time
 */

export const automationLanes = mysqlTable('automation_lanes', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull(),
  trackId: int('track_id'), // null for master automation
  parameter: varchar('parameter', { length: 255 }).notNull(), // e.g., 'volume', 'pan', 'eq.low'
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const automationPoints = mysqlTable('automation_points', {
  id: int('id').primaryKey().autoincrement(),
  laneId: int('lane_id').notNull(),
  time: float('time').notNull(), // Time in seconds
  value: float('value').notNull(), // Normalized value (0-1)
  curveType: varchar('curve_type', { length: 50 }).default('linear'), // 'linear', 'bezier', 'step'
  // Bezier control points (optional)
  handleInX: float('handle_in_x'),
  handleInY: float('handle_in_y'),
  handleOutX: float('handle_out_x'),
  handleOutY: float('handle_out_y'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type AutomationLane = typeof automationLanes.$inferSelect;
export type NewAutomationLane = typeof automationLanes.$inferInsert;
export type AutomationPoint = typeof automationPoints.$inferSelect;
export type NewAutomationPoint = typeof automationPoints.$inferInsert;

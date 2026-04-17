-- T7 completion: add full feature vector columns to gold_standard_generations.
-- PRD §5.2 requires every gold standard row to carry the complete feature vector
-- (all dimensions from §5.3) so fine-tuning jobs need no join back to generation_history.
ALTER TABLE `gold_standard_generations` ADD `audioUrl` text;--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `prompt` text;--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `culturalScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `culturalScoreBreakdown` json;--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `bpm` int;--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `key` varchar(10);--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `contrastScore` decimal(6,2);--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `grooveFingerprint` json;--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `timbralContractScore` decimal(4,2);--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `style` varchar(100);--> statement-breakpoint
ALTER TABLE `gold_standard_generations` ADD `parameters` json;

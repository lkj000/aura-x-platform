ALTER TABLE `custom_presets` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_presets` ADD `shareCode` varchar(32);--> statement-breakpoint
ALTER TABLE `custom_presets` ADD `importCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_presets` ADD CONSTRAINT `custom_presets_shareCode_unique` UNIQUE(`shareCode`);
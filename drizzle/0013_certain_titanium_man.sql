ALTER TABLE `generations` ADD `lyrics` text;--> statement-breakpoint
ALTER TABLE `generations` ADD `style` varchar(100);--> statement-breakpoint
ALTER TABLE `generations` ADD `title` varchar(255);--> statement-breakpoint
ALTER TABLE `generations` ADD `stemsUrl` json;--> statement-breakpoint
ALTER TABLE `generations` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `generations` ADD `variationType` varchar(50);--> statement-breakpoint
ALTER TABLE `generations` ADD `duration` int;--> statement-breakpoint
ALTER TABLE `generations` ADD `bpm` int;--> statement-breakpoint
ALTER TABLE `generations` ADD `key` varchar(10);--> statement-breakpoint
ALTER TABLE `generations` ADD `mood` varchar(100);--> statement-breakpoint
ALTER TABLE `generations` ADD `vocalStyle` varchar(100);--> statement-breakpoint
ALTER TABLE `generations` ADD `isFavorite` boolean DEFAULT false NOT NULL;
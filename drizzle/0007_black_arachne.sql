CREATE TABLE `custom_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(50) NOT NULL,
	`style` varchar(50) NOT NULL,
	`icon` varchar(50) NOT NULL,
	`prompt` text NOT NULL,
	`parameters` json NOT NULL,
	`culturalElements` json NOT NULL,
	`tags` json NOT NULL,
	`basedOnGenerationId` int,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preset_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`presetId` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preset_favorites_id` PRIMARY KEY(`id`)
);

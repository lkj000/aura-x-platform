CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationSoundEnabled` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'dark',
	`defaultGenerationMode` enum('creative','production') NOT NULL DEFAULT 'creative',
	`defaultTempo` int DEFAULT 112,
	`defaultKey` varchar(10) DEFAULT 'C',
	`defaultDuration` int DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);

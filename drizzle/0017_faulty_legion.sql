CREATE TABLE `gold_standard_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`generationId` int NOT NULL,
	`avgCulturalRating` decimal(3,2) NOT NULL,
	`avgSwingRating` decimal(3,2) NOT NULL,
	`avgLinguisticRating` decimal(3,2),
	`avgProductionRating` decimal(3,2),
	`feedbackCount` int NOT NULL,
	`favoriteCount` int NOT NULL DEFAULT 0,
	`isGoldStandard` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gold_standard_generations_id` PRIMARY KEY(`id`)
);

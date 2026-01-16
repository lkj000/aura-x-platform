CREATE TABLE `marketplace_bundle_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bundleId` int NOT NULL,
	`packId` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `marketplace_bundle_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_bundles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`originalPrice` decimal(10,2) NOT NULL,
	`bundlePrice` decimal(10,2) NOT NULL,
	`discountPercent` int NOT NULL,
	`coverImage` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_bundles_id` PRIMARY KEY(`id`)
);

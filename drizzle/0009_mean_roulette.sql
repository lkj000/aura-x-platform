CREATE TABLE `automation_lanes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`trackId` int,
	`parameter` varchar(255) NOT NULL,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_lanes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laneId` int NOT NULL,
	`time` decimal(10,3) NOT NULL,
	`value` decimal(5,4) NOT NULL,
	`curveType` varchar(50) DEFAULT 'linear',
	`handleInX` decimal(10,3),
	`handleInY` decimal(5,4),
	`handleOutX` decimal(10,3),
	`handleOutY` decimal(5,4),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `automation_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('completed','pending','refunded') DEFAULT 'completed',
	`purchasedAt` timestamp DEFAULT (now()),
	CONSTRAINT `marketplace_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_sample_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`tags` json,
	`coverImage` varchar(500),
	`previewAudio` varchar(500),
	`fileUrl` varchar(500) NOT NULL,
	`fileSize` int,
	`sampleCount` int,
	`downloads` int DEFAULT 0,
	`rating` decimal(3,2) DEFAULT 0,
	`reviewCount` int DEFAULT 0,
	`status` enum('active','pending','rejected') DEFAULT 'active',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_sample_packs_id` PRIMARY KEY(`id`)
);

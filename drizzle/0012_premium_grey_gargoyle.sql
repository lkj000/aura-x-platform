CREATE TABLE `activity_feed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actionType` enum('pack_uploaded','pack_purchased','review_posted','followed_user') NOT NULL,
	`targetId` int,
	`targetType` varchar(50),
	`metadata` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `activity_feed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `followers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`bio` text,
	`avatar` varchar(500),
	`coverImage` varchar(500),
	`location` varchar(100),
	`website` varchar(255),
	`twitter` varchar(100),
	`instagram` varchar(100),
	`soundcloud` varchar(100),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `producer_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `producer_profiles_userId_unique` UNIQUE(`userId`)
);

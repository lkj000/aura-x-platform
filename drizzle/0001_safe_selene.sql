CREATE TABLE `generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`type` varchar(50) NOT NULL,
	`prompt` text NOT NULL,
	`parameters` json,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`resultUrl` text,
	`culturalScore` decimal(5,2),
	`processingTime` int,
	`errorMessage` text,
	`workflowId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`duration` int,
	`format` varchar(20) NOT NULL,
	`sampleRate` int,
	`generationId` int,
	`metadata` json,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`tempo` int NOT NULL DEFAULT 112,
	`key` varchar(10) NOT NULL DEFAULT 'C',
	`mode` varchar(50) NOT NULL DEFAULT 'kasi',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`audioUrl` text,
	`duration` int,
	`volume` decimal(5,2) NOT NULL DEFAULT '1.00',
	`pan` decimal(3,2) NOT NULL DEFAULT '0.00',
	`muted` boolean NOT NULL DEFAULT false,
	`solo` boolean NOT NULL DEFAULT false,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);

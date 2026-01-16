CREATE TABLE `generation_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`generationId` int NOT NULL,
	`workflowId` varchar(255),
	`priority` int NOT NULL DEFAULT 0,
	`status` enum('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`queuePosition` int,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`estimatedWaitTime` int,
	`parameters` json,
	`errorMessage` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `generation_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_queue_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`concurrentJobs` int NOT NULL DEFAULT 0,
	`maxConcurrentJobs` int NOT NULL DEFAULT 3,
	`totalJobsQueued` int NOT NULL DEFAULT 0,
	`totalJobsCompleted` int NOT NULL DEFAULT 0,
	`totalJobsFailed` int NOT NULL DEFAULT 0,
	`lastJobAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_queue_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_queue_stats_userId_unique` UNIQUE(`userId`)
);

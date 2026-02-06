CREATE TABLE `samplePackDownloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`userId` int NOT NULL,
	`downloadedAt` timestamp DEFAULT (now()),
	CONSTRAINT `samplePackDownloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `samplePackFolders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentFolderId` int,
	`path` text,
	`sampleCount` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `samplePackFolders_id` PRIMARY KEY(`id`)
);

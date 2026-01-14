CREATE TABLE `sample_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`version` varchar(50) DEFAULT '1.0.0',
	`author` varchar(255),
	`genre` varchar(100) DEFAULT 'amapiano',
	`subgenre` varchar(100),
	`coverImageUrl` text,
	`totalSamples` int DEFAULT 0,
	`totalSizeMb` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sample_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int,
	`name` varchar(255) NOT NULL,
	`category` enum('log-drum','shaker','chord','bass','saxophone','vocal','percussion','fx','loop','one-shot') NOT NULL,
	`instrument` varchar(100),
	`key` varchar(10),
	`bpm` int,
	`duration` varchar(50),
	`fileUrl` text NOT NULL,
	`waveformUrl` text,
	`fileSize` int,
	`format` varchar(20) DEFAULT 'wav',
	`sampleRate` int DEFAULT 44100,
	`bitDepth` int DEFAULT 24,
	`tags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `samples_id` PRIMARY KEY(`id`)
);

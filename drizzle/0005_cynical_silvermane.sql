CREATE TABLE `audio_clips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`startTime` decimal(10,3) NOT NULL,
	`duration` decimal(10,3) NOT NULL,
	`offset` decimal(10,3) NOT NULL,
	`fadeIn` decimal(5,3) NOT NULL,
	`fadeOut` decimal(5,3) NOT NULL,
	`gain` decimal(5,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audio_clips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `midi_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`pitch` varchar(10) NOT NULL,
	`time` decimal(10,3) NOT NULL,
	`duration` decimal(10,3) NOT NULL,
	`velocity` decimal(3,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `midi_notes_id` PRIMARY KEY(`id`)
);

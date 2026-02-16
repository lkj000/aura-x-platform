CREATE TABLE `dj_performance_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`durationTargetSec` int NOT NULL,
	`preset` varchar(100) NOT NULL,
	`riskLevel` decimal(3,2) NOT NULL,
	`allowVocalOverlay` boolean NOT NULL DEFAULT false,
	`planJson` json NOT NULL,
	`trackCount` int NOT NULL,
	`transitionCount` int NOT NULL,
	`harmonicClashScore` decimal(3,2),
	`energySmoothnessScore` decimal(3,2),
	`vocalOverlapScore` decimal(3,2),
	`variationGroup` varchar(64),
	`variationIndex` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dj_performance_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dj_renders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`userId` int NOT NULL,
	`mixUrl` text,
	`mixKey` varchar(500),
	`cueSheetUrl` text,
	`cueSheetKey` varchar(500),
	`format` varchar(10) NOT NULL DEFAULT 'mp3',
	`bitrate` int DEFAULT 320,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`renderTimeSec` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `dj_renders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dj_stems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`modelVersion` varchar(50) NOT NULL,
	`vocalsUrl` text,
	`vocalsKey` varchar(500),
	`drumsUrl` text,
	`drumsKey` varchar(500),
	`bassUrl` text,
	`bassKey` varchar(500),
	`otherUrl` text,
	`otherKey` varchar(500),
	`processingTimeSec` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dj_stems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dj_track_features` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`bpm` decimal(6,2),
	`bpmConfidence` decimal(3,2),
	`beatgrid` json,
	`downbeats` json,
	`key` varchar(10),
	`keyConfidence` decimal(3,2),
	`camelotKey` varchar(5),
	`compatibleKeys` json,
	`energyCurve` json,
	`energyAvg` decimal(3,2),
	`energyPeak` decimal(3,2),
	`lufs` decimal(5,2),
	`truePeak` decimal(5,2),
	`segments` json,
	`mixabilityScore` decimal(3,2),
	`analyzerVersion` varchar(50) DEFAULT '1.0.0',
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dj_track_features_id` PRIMARY KEY(`id`),
	CONSTRAINT `dj_track_features_trackId_unique` UNIQUE(`trackId`)
);
--> statement-breakpoint
CREATE TABLE `dj_tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileType` varchar(20) NOT NULL,
	`fileSize` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`durationSec` decimal(10,3),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dj_tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dj_vibe_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(50) NOT NULL,
	`energyArc` json NOT NULL,
	`targetBpmCurve` json NOT NULL,
	`harmonicStrictness` decimal(3,2) NOT NULL,
	`maxDeltaBpmPerTransition` int NOT NULL DEFAULT 3,
	`maxSemitonesShift` int NOT NULL DEFAULT 2,
	`allowVocalOverlay` boolean NOT NULL DEFAULT false,
	`transitionTypeWeights` json NOT NULL,
	`icon` varchar(50) NOT NULL,
	`isBuiltIn` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dj_vibe_presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `dj_vibe_presets_name_unique` UNIQUE(`name`)
);

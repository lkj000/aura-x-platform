CREATE TABLE `marketplace_downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packId` int NOT NULL,
	`purchaseId` int NOT NULL,
	`downloadedAt` timestamp DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `marketplace_downloads_id` PRIMARY KEY(`id`)
);

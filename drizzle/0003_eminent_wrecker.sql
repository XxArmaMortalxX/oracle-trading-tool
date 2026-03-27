CREATE TABLE `sentiment_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(10) NOT NULL,
	`sentimentScore` int NOT NULL,
	`sentimentLabel` varchar(20) NOT NULL,
	`sessionId` int,
	`components` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sentiment_history_id` PRIMARY KEY(`id`)
);

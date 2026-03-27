CREATE TABLE `reddit_sentiment_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(10) NOT NULL,
	`bullishPct` int NOT NULL DEFAULT 0,
	`bearishPct` int NOT NULL DEFAULT 0,
	`neutralPct` int NOT NULL DEFAULT 0,
	`totalMentions` int NOT NULL DEFAULT 0,
	`crowdBias` varchar(20) NOT NULL,
	`snapshotId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reddit_sentiment_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sentiment_shift_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(10) NOT NULL,
	`previousBias` varchar(20) NOT NULL,
	`newBias` varchar(20) NOT NULL,
	`previousBullishPct` int NOT NULL DEFAULT 0,
	`newBullishPct` int NOT NULL DEFAULT 0,
	`previousBearishPct` int NOT NULL DEFAULT 0,
	`newBearishPct` int NOT NULL DEFAULT 0,
	`shiftMagnitude` int NOT NULL DEFAULT 0,
	`severity` varchar(20) NOT NULL,
	`direction` varchar(30) NOT NULL,
	`totalMentions` int DEFAULT 0,
	`notified` int DEFAULT 0,
	`dismissed` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sentiment_shift_alerts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int DEFAULT 1,
	`minOracleScore` int DEFAULT 60,
	`biasFilter` enum('ALL','LONG','SHORT') DEFAULT 'ALL',
	`maxPicks` int DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_picks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`ticker` varchar(10) NOT NULL,
	`companyName` varchar(255),
	`bias` enum('LONG','SHORT') NOT NULL,
	`currentPrice` float,
	`entryPrice` float,
	`stopLoss` float,
	`target1` float,
	`target2` float,
	`target3` float,
	`riskRewardRatio` float,
	`oracleScore` int DEFAULT 0,
	`marketCap` float,
	`floatShares` float,
	`volume` int,
	`avgVolume` int,
	`gapPercent` float,
	`dayChangePercent` float,
	`support` float,
	`resistance` float,
	`reasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_picks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanDate` varchar(10) NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`totalStocksScanned` int DEFAULT 0,
	`picksGenerated` int DEFAULT 0,
	`notificationSent` int DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_sessions_id` PRIMARY KEY(`id`)
);

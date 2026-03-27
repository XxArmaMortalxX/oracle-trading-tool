CREATE TABLE `reddit_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(10) NOT NULL,
	`mentions` int NOT NULL DEFAULT 0,
	`mentions24hAgo` int DEFAULT 0,
	`upvotes` int DEFAULT 0,
	`rank` int,
	`rank24hAgo` int,
	`velocityPct` float DEFAULT 0,
	`velocityAbs` int DEFAULT 0,
	`snapshotId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reddit_mentions_id` PRIMARY KEY(`id`)
);

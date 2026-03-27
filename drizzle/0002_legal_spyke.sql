ALTER TABLE `scan_picks` ADD `sentimentScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `scan_picks` ADD `sentimentLabel` varchar(20);
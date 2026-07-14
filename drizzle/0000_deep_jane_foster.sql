CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `boss_month` (
	`userId` text NOT NULL,
	`monthKey` text NOT NULL,
	`chars` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`userId`, `monthKey`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `boss_week` (
	`userId` text NOT NULL,
	`weekKey` text NOT NULL,
	`chars` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`userId`, `weekKey`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cash` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`cat` text DEFAULT '기타' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `equip` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`part` text DEFAULT '장신구' NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`buyDate` text DEFAULT '' NOT NULL,
	`buyPrice` integer DEFAULT 0 NOT NULL,
	`buyMkt` integer DEFAULT 0 NOT NULL,
	`buyRice` integer DEFAULT 0 NOT NULL,
	`tariff` integer DEFAULT false NOT NULL,
	`sellDate` text DEFAULT '' NOT NULL,
	`sellPrice` integer,
	`sellMkt` integer,
	`sellRice` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hunt` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`date` text NOT NULL,
	`sojaebi` integer DEFAULT 0 NOT NULL,
	`meso` integer DEFAULT 0 NOT NULL,
	`sol` integer DEFAULT 0 NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`cat` text DEFAULT '기타' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `level_log` (
	`userId` text NOT NULL,
	`date` text NOT NULL,
	`level` integer NOT NULL,
	`rate` real NOT NULL,
	`live` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`userId`, `date`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`userId` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '용사' NOT NULL,
	`greet` text DEFAULT '오늘도 재획 화이팅' NOT NULL,
	`goal` integer DEFAULT 0 NOT NULL,
	`solPrice` integer DEFAULT 5700000 NOT NULL,
	`mktPrice` integer DEFAULT 2600 NOT NULL,
	`cashPrice` integer DEFAULT 1900 NOT NULL,
	`nexonKey` text DEFAULT '' NOT NULL,
	`mapleName` text DEFAULT '' NOT NULL,
	`ocid` text DEFAULT '' NOT NULL,
	`ocidName` text DEFAULT '' NOT NULL,
	`charImage` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);

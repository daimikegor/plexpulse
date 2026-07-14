CREATE TABLE `media_status` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` text NOT NULL,
	`media_type` text NOT NULL,
	`status` text DEFAULT 'none' NOT NULL,
	`last_checked` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`plex_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`is_admin` integer DEFAULT false
);

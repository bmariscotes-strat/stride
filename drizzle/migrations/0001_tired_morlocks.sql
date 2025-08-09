ALTER TABLE "activity_log" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_team_id" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_team_id_idx" ON "activity_log" USING btree ("team_id");
ALTER TYPE "public"."notification_type" ADD VALUE 'team_role_changed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'task_created';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'task_moved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'task_reassigned';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_created';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_updated';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_archived';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_deleted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_restored';--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_team_id" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
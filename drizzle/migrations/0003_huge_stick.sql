CREATE TYPE "public"."project_team_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_team_added';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_team_removed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_permissions_changed';--> statement-breakpoint
CREATE TABLE "project_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" "project_team_role" NOT NULL,
	"added_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_team_unique" UNIQUE("project_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "team_slug_unique";--> statement-breakpoint
ALTER TABLE "labels" DROP CONSTRAINT "fk_labels_team_id";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "fk_projects_team_id";
--> statement-breakpoint
DROP INDEX "labels_team_id_idx";--> statement-breakpoint
DROP INDEX "projects_team_id_idx";--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "fk_project_teams_project_id" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "fk_project_teams_team_id" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "fk_project_teams_added_by" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_teams_project_id_idx" ON "project_teams" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_teams_team_id_idx" ON "project_teams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "project_teams_added_by_idx" ON "project_teams" USING btree ("added_by");--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "fk_labels_project_id" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "labels_project_id_idx" ON "labels" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "labels" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "project_slug_unique" UNIQUE("slug");
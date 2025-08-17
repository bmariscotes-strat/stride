CREATE TABLE "project_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"team_member_id" uuid NOT NULL,
	"role" "project_team_role" NOT NULL,
	"added_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_member_unique" UNIQUE("project_id","team_member_id")
);
--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "fk_project_team_members_project_id" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "fk_project_team_members_team_member_id" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "fk_project_team_members_added_by" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_team_members_project_id_idx" ON "project_team_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_team_members_team_member_id_idx" ON "project_team_members" USING btree ("team_member_id");--> statement-breakpoint
CREATE INDEX "project_team_members_added_by_idx" ON "project_team_members" USING btree ("added_by");
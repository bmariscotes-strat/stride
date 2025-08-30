// app/teams/TeamsClient.tsx (Client Component)
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getTeamsForUser } from "@/lib/services/teams";
import { Users, Plus, Calendar } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import Button from "@/components/ui/Button";

export default function TeamsClient() {
  const { userData, clerkUser, loading } = useUserContext();
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const currentUserId = userData?.id || clerkUser?.id;

  useEffect(() => {
    const fetchTeams = async () => {
      if (!currentUserId) return;
      try {
        const teams = await getTeamsForUser(currentUserId);
        setUserTeams(teams);
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [currentUserId]);

  if (loading || loadingTeams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <div className="flex items-center justify-between mt-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and collaborate with your teams
            </p>
          </div>
          <Link href="/team/create">
            <Button
              leftIcon={<Plus />}
              variant="primary"
              style="filled"
              size="sm"
            >
              Create Team
            </Button>
          </Link>
        </div>

        {userTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No teams</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first team.
            </p>
            <div className="mt-6">
              <Link href="/team/create">
                <Button
                  leftIcon={<Plus />}
                  variant="primary"
                  style="filled"
                  size="sm"
                >
                  Create Team
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTeams.map((team) => (
              <Link
                key={team.id}
                href={`/team/${team.slug}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {team.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {team.role}
                      </p>
                    </div>
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{team.members?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>
                        Created {new Date(team.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        team.role === "owner"
                          ? "bg-purple-100 text-purple-800"
                          : team.role === "admin"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {team.role}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

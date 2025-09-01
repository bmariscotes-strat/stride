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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 dark:border-blue-600/20 border-t-primary dark:border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-6 md:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
              Teams
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage and collaborate with your teams
            </p>
          </div>
          <Link href="/team/create" className="flex-shrink-0">
            <Button
              leftIcon={<Plus />}
              variant="primary"
              style="filled"
              size="sm"
            >
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
        </div>

        {userTeams.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <Users className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
              No teams
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
            {userTeams.map((team) => (
              <Link
                key={team.id}
                href={`/team/${team.slug}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md dark:hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 group"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                        {team.name}
                      </h3>
                    </div>
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                      {team.description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users size={14} className="flex-shrink-0" />
                      <span>{team.members?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        Created {new Date(team.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        team.role === "owner"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                          : team.role === "admin"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {team.role.charAt(0).toUpperCase() + team.role.slice(1)}
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

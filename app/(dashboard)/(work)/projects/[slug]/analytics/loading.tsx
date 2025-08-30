import React from "react";
import { Skeleton } from "@/components/ui/shared/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          {/* Breadcrumb skeleton */}
          <div className="flex items-center space-x-2 mb-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Title and description */}
          <Skeleton className="h-8 w-32 mb-2" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Controls skeleton */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cards by Status */}
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="flex items-center justify-center h-[300px]">
            <div className="relative">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white dark:bg-outer_space-500" />
            </div>
          </div>
        </div>

        {/* Cards by Priority */}
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="h-[300px] space-y-4">
            <div className="flex justify-between items-end h-48">
              {[1, 2, 3, 4].map((bar) => (
                <Skeleton
                  key={bar}
                  className={`w-12 h-${Math.floor(Math.random() * 32) + 16}`}
                />
              ))}
            </div>
            <div className="flex justify-between">
              {[1, 2, 3, 4].map((label) => (
                <Skeleton key={label} className="h-4 w-12" />
              ))}
            </div>
          </div>
        </div>

        {/* Activity Trend */}
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="h-[300px]">
            <div className="h-64 flex items-end justify-between">
              {[1, 2, 3, 4, 5, 6, 7].map((point) => (
                <div
                  key={point}
                  className="flex flex-col items-center space-y-1"
                >
                  <Skeleton
                    className={`w-8 h-${Math.floor(Math.random() * 24) + 8}`}
                  />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="h-[300px] space-y-4">
            <div className="flex justify-between items-end h-48">
              {[1, 2, 3].map((group) => (
                <div key={group} className="flex space-x-1">
                  <Skeleton className="w-6 h-32" />
                  <Skeleton className="w-6 h-24" />
                  <Skeleton className="w-6 h-16" />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {[1, 2, 3].map((label) => (
                <Skeleton key={label} className="h-4 w-16" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rate Trend */}
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="h-[300px]">
            <div className="h-64 relative">
              <svg className="w-full h-full">
                <path
                  d="M 50 200 Q 100 150 150 180 T 250 160 T 350 140 T 450 120"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-300 dark:text-gray-600"
                />
              </svg>
            </div>
            <div className="flex justify-between mt-4">
              {[1, 2, 3, 4, 5].map((label) => (
                <Skeleton key={label} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </div>

        {/* Average Time in Columns */}
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
          <Skeleton className="h-6 w-44 mb-4" />
          <div className="h-[300px] space-y-4">
            {[1, 2, 3, 4].map((bar) => (
              <div key={bar} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton
                  className={`h-6 w-${Math.floor(Math.random() * 32) + 16}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Productivity Table */}
      <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700">
                <th className="text-left p-3">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="text-center p-3">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="text-center p-3">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="text-center p-3">
                  <Skeleton className="h-4 w-28" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr
                  key={row}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="p-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="h-6 w-12 mx-auto rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-1">
          <Skeleton className="h-3 w-96" />
          <Skeleton className="h-3 w-80" />
        </div>
      </div>

      {/* Permission notice skeleton */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

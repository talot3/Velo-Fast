import { QueryClient } from "@tanstack/react-query"

import { isNetworkError } from "@/lib/errors"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        retry: (count, error) => isNetworkError(error) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}

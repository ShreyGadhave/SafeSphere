import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      // Safety data should refresh when the user comes back to the app.
      refetchOnWindowFocus: true,
    },
  },
});

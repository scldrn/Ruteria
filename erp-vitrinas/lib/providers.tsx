'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { OfflineSyncBootstrap } from '@/components/pwa/OfflineSyncBootstrap'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistration />
      <OfflineSyncBootstrap />
      {children}
    </QueryClientProvider>
  )
}

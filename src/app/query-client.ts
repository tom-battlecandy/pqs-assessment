import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
    },
  },
})

export const queryClientPlugin = {
  install(app: Parameters<typeof VueQueryPlugin.install>[0]) {
    app.use(VueQueryPlugin, { queryClient })
  },
}

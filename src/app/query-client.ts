import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const queryClient = new QueryClient()

export const queryClientPlugin = {
  install(app: Parameters<typeof VueQueryPlugin.install>[0]) {
    app.use(VueQueryPlugin, { queryClient })
  },
}

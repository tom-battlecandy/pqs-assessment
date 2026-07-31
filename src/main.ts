import { createApp } from 'vue'

import App from '@/app/App.vue'
import { queryClientPlugin } from '@/app/query-client'
import { router } from '@/app/router'
import { vuetify } from '@/app/vuetify'
import '@/app/styles.css'

createApp(App).use(router).use(vuetify).use(queryClientPlugin).mount('#app')

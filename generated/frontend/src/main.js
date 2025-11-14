import { createApp } from 'vue';
import App from './App.vue';

// Import router (generated dynamically)
let router;
try {
  const routerModule = await import('./router.js');
  router = routerModule.default;
} catch (error) {
  console.warn('Router not found. Generate a table configuration first.');
}

const app = createApp(App);

if (router) {
  app.use(router);
}

app.mount('#app');

<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <h1>Admin Panel</h1>
        <nav class="main-nav" v-if="$route">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="nav-link"
          >
            {{ link.label }}
          </router-link>
        </nav>
      </div>
    </header>
    <main class="app-main">
      <div class="container">
        <router-view v-if="$route" />
        <div v-else class="welcome">
          <h2>Welcome to Admin Panel</h2>
          <p>No tables configured yet. Please use the Developer Panel to generate admin interfaces.</p>
        </div>
      </div>
    </main>
    <footer class="app-footer">
      <div class="container">
        <p>Auto-generated Admin Panel &copy; 2024</p>
      </div>
    </footer>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'App',
  setup() {
    const router = useRouter();

    const navLinks = computed(() => {
      if (!router) return [];

      // Extract unique table names from routes
      const tables = new Set();
      router.getRoutes().forEach(route => {
        const match = route.path.match(/^\/(\w+)\/(list|create|edit)/);
        if (match) {
          tables.add(match[1]);
        }
      });

      return Array.from(tables).map(table => ({
        path: `/${table}/list`,
        label: table.charAt(0).toUpperCase() + table.slice(1)
      }));
    });

    return {
      navLinks
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f5f7fa;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 28px;
  margin-bottom: 15px;
}

.main-nav {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background 0.2s;
  font-weight: 500;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.3);
}

.app-main {
  flex: 1;
  padding: 30px 0;
}

.welcome {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.welcome h2 {
  font-size: 32px;
  color: #667eea;
  margin-bottom: 15px;
}

.welcome p {
  font-size: 18px;
  color: #666;
}

.app-footer {
  background: #2c3e50;
  color: white;
  padding: 20px 0;
  text-align: center;
}

.app-footer p {
  font-size: 14px;
  opacity: 0.8;
}
</style>

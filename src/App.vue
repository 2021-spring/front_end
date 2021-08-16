<template>
  <div id="App">
    <v-app>
      <Navbar></Navbar>
      <main class="viteusa">
        <router-view :key="$route.fullPath"></router-view>
      </main>
    </v-app>
  </div>
</template>

<script>
import Navbar from './components/Navbar'

export default {
  name: 'App',
  components: {
    Navbar
  }
}
</script>

<style>
* { 
   text-transform: none !important; 
}
/* Override vuetify original v-window style in order to keep pagination controller work well */
.v-window .v-window__container.v-window__container--is-active {
  overflow: inherit;
}

.required_field label::after {
  content: "*";
}

.viteusa table.v-table tbody td:first-child, .viteusa table.v-table tbody td:not(:first-child), .viteusa table.v-table tbody th:first-child, .viteusa table.v-table tbody th:not(:first-child), .viteusa table.v-table thead td:first-child, .viteusa table.v-table thead td:not(:first-child), .viteusa table.v-table thead th:first-child, .viteusa table.v-table thead th:not(:first-child) {
  padding: 0 12px;
}

.success--text.caption .realtime-border {
  border: 1px solid;
}
</style>

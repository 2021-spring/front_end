<template>
  <v-autocomplete 
    v-bind="$attrs"
    v-on="$listeners"
    browser-autocomplete="no"
  />
</template>

<script>
export default {
  name: 'ViteAutocomplete'
}
</script>

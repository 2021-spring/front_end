<template>
  <div v-if="address">
    <v-layout class="font-weight-bold">
      {{ address.fullName }}
    </v-layout>
    <v-layout v-if="address.company">
      {{ address.company }}
    </v-layout>
    <v-layout wrap>
      <span>
        {{ address.address1 }}
      </span>
      <span wrap v-if="address.address2">
        , {{ address.address2 }}
      </span>
    </v-layout>
    <v-layout wrap>
      {{ address.city }}, {{ address.state }} - {{ address.zipCode }}
    </v-layout>
    <v-layout wrap>
      {{ address.phone }}
    </v-layout>
  </div>
</template>

<script>

export default {
  name: 'LabelAddressWidget',
  props: {
    address: Object
  }
}
</script>

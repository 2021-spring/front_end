<template>
  <v-card style="height: 100%; display: flex; flex-direction: column;">
    <v-card-text style="flex-grow: 1;">
      <v-layout class="font-weight-bold">
        <v-flex class="word-break">{{ address.siteName }}</v-flex>
      </v-layout>
      <v-layout>
        <v-flex class="word-break">{{ address.fullName }}</v-flex>
      </v-layout>
      <v-layout v-if="address.company">
        <v-flex class="word-break">{{ address.company }}</v-flex>
      </v-layout>
      <v-layout>
        <v-flex class="word-break">{{ address.address1 }}</v-flex>
      </v-layout>
      <v-layout v-if="address.address2">
        <v-flex class="word-break">{{ address.address2 }}</v-flex>
      </v-layout>
      <v-layout>
        <v-flex class="word-break">{{ address.city }} - {{ address.state }} - {{ address.zipCode }}</v-flex>
      </v-layout>
      <v-layout v-if="address.countryCode">
        <v-flex class="word-break">{{ address.countryCode }}</v-flex>
      </v-layout>
      <v-layout v-if="address.partyId">
        <v-flex class="word-break">{{ address.partyId }}</v-flex>
      </v-layout>
      <v-layout>
        <v-flex class="word-break">{{ address.phone }}</v-flex>
      </v-layout>
    </v-card-text>
    <v-card-actions>
      <v-layout justify-space-around text-xs-center>
        <v-flex>
          <v-btn color="primary" small @click="$emit('edit')" :disabled="address.isAmazon">Edit</v-btn>
        </v-flex>
        <v-flex>
          <v-btn color="primary" small @click="$emit('delete')" :disabled="address.isAmazon">Delete</v-btn>
        </v-flex>
      </v-layout>
    </v-card-actions>
  </v-card>
</template>

<script>

export default {
  name: 'LabelAddressCard',
  props: {
    address: Object
  }
}
</script>

<style>
.word-break {
  overflow-wrap: break-word; 
  word-break: break-all;
}
</style>

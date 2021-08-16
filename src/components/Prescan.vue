<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem.value" :href="`#${tabItem.value}`">
          {{ tabItem.displayName }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item value="prescan">
          <PrescanMainTab
            :carrierMap="carrierMap"
            :serviceTypeMap="serviceTypeMap"/>
        </v-tab-item>
        <v-tab-item value="history">
          <PrescanHistoryTab
            :carrierMap="carrierMap"
            :serviceTypeMap="serviceTypeMap"/>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
  </v-container>
</template>

<script>
import PrescanMainTab from './PrescanMainTab'
import PrescanHistoryTab from './PrescanHistoryTab'

export default {
  name: 'Prescan',
  components: {
    PrescanMainTab,
    PrescanHistoryTab
  },
  data () {
    return {
      tab: 'prescan',
      tabs: [
        {displayName: 'Prescan', value: 'prescan'},
        {displayName: 'History', value: 'history'}
      ],
      serviceTypeMap: {
        ground: 'Ground',
        express: 'Express',
        all: 'All'
      },
      carrierMap: {
        usps: 'USPS',
        fedex: 'FedEx',
        ups: 'UPS',
        tba: 'TBA',
        lasership: 'Lasership',
        other: 'Other'
      }
    }
  }
}
</script>

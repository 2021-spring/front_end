<template >
  <v-toolbar-items 
    v-if="activeOrganization && promotions && promotions.size" 
    > 
    <v-btn class="promotion-toggle" flat dark
      @click.stop="showPromotions">
      <v-badge :value="promotionsUnreadList.length"  color="red">
        <template v-slot:badge>
          <div dark>{{promotionsUnreadList.length}}</div>
        </template>
        <img src="@/assets/giftbox.png" alt="" style="width:28px;">
      </v-badge>
    </v-btn>
    <v-dialog 
      v-model="dialog" 
      width="600" 
      persistent>
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title class="mx-auto">Promotions</v-toolbar-title>
        </v-toolbar>
        <v-container fluid style="min-height: 0;" grid-list-lg>
          <v-layout row wrap>
            <v-flex sm6 class="headline">
              <v-select
                :items="allPreferredWarehousesHasPromotions"
                label="Warehouse"
                item-text="warehouseName"
                return-object
                v-model="currentWarehouse"
              ></v-select>
            </v-flex>
          </v-layout>
          <v-layout row wrap>
            <v-flex
              xs12
              class="mb-1"
              v-for="(promotion, index) in currentPromotions"
              :key="'item' + index"
            >
              <v-card hover raised>
                <v-card-text>
                  <div class="title">{{ promotion.title }}</div>
                  <div
                    class="subheading"
                  >{{ toPickerDateString(promotion.startDate) + ' to ' + toPickerDateString(promotion.endDate) }}</div>
                  <div class="cardText body-2 mt-2">{{ promotion.note }}</div>
                  <v-divider></v-divider>
                  <div
                    class="body-1 mt-2"
                    style="color: #42A5F5"
                    v-if="!(promotion.isAllowMultiple)"
                  >( * This promotion will only apply once per user )</div>
                </v-card-text>
              </v-card>
            </v-flex>
          </v-layout>
        </v-container>
        <v-divider></v-divider>

        <v-card-actions>
          <v-btn color="primary" flat @click="closePromotions">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-toolbar-items>
</template>

<script>
import { timeTools } from '../utils/tools'
import { mapGetters } from 'vuex'

export default {
  name: 'PromotionWidget',
  mixins: [timeTools],
  data () {
    return {
      dialog: '',
      currentWarehouse: {},
      readListMap: {}
    }
  },
  mounted () {
    this.readListMap = new Map()
  },
  watch: {
    currentWarehouse (warehouse) {
      let unreadPromotions = this.currentPromotions
        .filter(promotion => !(promotion.readList && promotion.readList.find(orgId => orgId === this.activeOrganization)))
      if (!unreadPromotions.length) return
      let rList = [].concat(this.readListMap.get(warehouse.warehouseKey) || [], unreadPromotions.map(promotion => promotion.key))
      this.readListMap.set(warehouse.warehouseKey, rList.filter((promotion, index) => rList.indexOf(promotion) === index))
    }
  },
  computed: {
    ...mapGetters({
      promotions: 'warehousesPromotionsMap',
      allPreferredWarehouses: 'allPreferredWarehouses',
      activeOrganization: 'activeOrganization',
      promotionsUnreadList: 'promotionsUnreadList'
    }),
    allPreferredWarehousesHasPromotions () {
      return this.allPreferredWarehouses
        .filter(({warehouseKey}) => (this.promotions.get(warehouseKey) || []).length > 0)
    },
    currentPromotions () {
      return this.promotions.get(this.currentWarehouse.warehouseKey) || []
    }
  },
  methods: {
    showPromotions () {
      if (!this.currentWarehouse.warehouseKey) {
        this.currentWarehouse = (this.allPreferredWarehousesHasPromotions.length && this.allPreferredWarehousesHasPromotions[0]) || {}        
      }
      this.dialog = true
    },
    closePromotions () {
      this.dialog = false
      this.$store.dispatch('updateTenantReadList', this.readListMap).then(resArr => {
        this.readListMap.clear()
      })
    }
  },
  props: {
  }
}
</script>

<style>
.cardText {
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

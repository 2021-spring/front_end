<template>
  <v-container fluid>
    <v-card>
      <v-snackbar
        :timeout="30000"
        :top="true"
        :color="toastColor"
        v-model="toastEnable"
      >
        {{ toastText }}
        <v-btn dark flat @click.stop="toastEnable = false"><v-icon>close</v-icon></v-btn>
      </v-snackbar>
    </v-card>

    <UpcMainTabItem
      @showToast="showToast"
      @showAddUpcDialog="showAddUpcDialog"/>

    <InboundAddUpcPopup
      v-if="addUpcDialog"
      v-model="addUpcDialog"
      hasMultiple/>
  </v-container>
</template>

<script>
import UpcMainTabItem from './UpcMainTabItem'
import InboundAddUpcPopup from './InboundAddUpcPopup'

export default {
  name: 'Upc',
  components: {
    UpcMainTabItem,
    InboundAddUpcPopup
  },
  data () {
    return {
      toastColor: 'error',
      toastEnable: false,
      toastText: '',
      toastMsgs: [],
      addUpcDialog: false
    }
  },
  methods: {
    showToast (e) {
      Object.assign(this, e)
    },
    showAddUpcDialog () {
      this.addUpcDialog = true
    }
  }
}
</script>

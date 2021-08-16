<template>
  <v-container fluid>
    <PaginationController
      ref="historyTable"
      v-model="auditRecords"
      getDataActionName="getAuditRecords"
      :historyLimit="historyLimit"
      haveStartDate
    >
      <template v-slot:dataTable>
        <v-data-table
          :headers="headers"
          :items="auditRecords"
          item-key="_key"
          hide-actions
        >
          <template v-slot:items="props">
            <td class="text-xs-left">{{ props.item._key }}</td>
            <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
            <td class="text-xs-left">{{ props.item.status === 'done' ? toTimestampString(props.item.lastModifiedTime) : '' }}</td>
            <td class="text-xs-left">{{ Object.entries(props.item.upcs || {}).length }}</td>
            <td class="text-xs-left">{{ props.item.workerName }}</td>
            <td class="text-xs-left">{{ (siteKeyMap.get(props.item.siteKey) || {}).siteName }}</td>
            <td class="text-xs-left" style="overflow-wrap: break-word; white-space: pre-wrap; max-width: 25vw; min-width: 15vw;">{{ props.item.note }}</td>
            <td class="text-xs-center">
              <v-layout justify-center>
                <v-btn 
                  color="primary" 
                  flat 
                  v-if="props.item.status === 'pending'" 
                  @click="showEditAuditDialog(props.item)"
                >Open</v-btn>
                <v-btn 
                  color="primary" 
                  flat 
                  v-else 
                  @click="showEditAuditDialog(props.item)"
                >Details</v-btn>
                <v-btn 
                  color="primary" 
                  flat 
                  @click="showEditNoteDialog(props.item)"
                >Note</v-btn>
                <LoaderButton
                  buttonText="Close"
                  :promiseAwait="confirmAudit"
                  :promiseItem="props.item"
                  flat
                  v-if="props.item.status === 'pending'"></LoaderButton>
                <v-flex v-else></v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </template>
      <template v-slot:beforeMenu>
        <v-btn dark color="primary" @click.stop="showAuditCreateDialog"><v-icon dark>add</v-icon>New audit</v-btn>
      </template>
    </PaginationController>
    <WarehouseAuditEditPopup
      v-if="showAuditEditPopup"
      v-model="showAuditEditPopup"
      :initRecord="auditRecordInEdit"
      @onSubmitted="onEditAudit"/>
    <WarehouseAuditCreatePopup
      v-if="showAuditCreatePopup"
      v-model="showAuditCreatePopup"
      @onSubmitted="onCreateAudit"/>
    <FormSubmitPopup
      title="Edit note"
      v-model="editNoteDialog"
      v-if="editNoteDialog"
      medium
      @popupClose="editNoteDialog = false"
      :rightMethod="editNote"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-space-between>
            <v-flex>
              <v-textarea
                label="Note"
                outline
                v-model="note"></v-textarea>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
  </v-container>
</template>

<script>

import {timeTools} from '@/utils/tools'
import PaginationController from './PaginationController'
import SimpleTextPopup from './SimpleTextPopup'
import WarehouseAuditEditPopup from './WarehouseAuditEditPopup'
import WarehouseAuditCreatePopup from './WarehouseAuditCreatePopup'
import LoaderButton from './LoaderButton'
import FormSubmitPopup from './FormSubmitPopup'

export default {
  name: 'WarehouseAudit',
  components: {
    PaginationController,
    SimpleTextPopup,
    WarehouseAuditEditPopup,
    WarehouseAuditCreatePopup,
    LoaderButton,
    FormSubmitPopup
  },
  mixins: [
    timeTools
  ],
  data () {
    return {
      auditRecords: [],
      historyLimit: 25,
      headers: [
        { text: 'ID', sortable: false, value: '_key', width: '15%' },
        { text: 'Create time', sortable: false, value: 'createTime', width: '15%' },
        { text: 'Close time', sortable: false, value: '', width: '15%' },
        { text: 'UPC qty', sortable: false, value: '', width: '15%' },
        { text: 'Operator', sortable: false, value: 'workerName' },
        { text: 'Site name', sortable: false, value: '' },
        { text: 'Note', sortable: false, value: 'note' },
        { text: 'Action', sortable: false, value: 'action', width: '10%', align: 'center' }
      ],
      showAuditEditPopup: false,
      auditRecordInEdit: {},
      showAuditCreatePopup: false,
      editNoteDialog: false,
      note: ''
    }
  },
  computed: {
    siteKeyMap () {
      return this.$store.getters.warehousesSiteKeyMap
    }
  },
  methods: {
    showEditAuditDialog (item) {
      this.auditRecordInEdit = item
      this.showAuditEditPopup = true
    },
    showEditNoteDialog (item) {
      this.auditRecordInEdit = item
      this.editNoteDialog = true
      this.note = item.note
    },
    showAuditCreateDialog () {
      this.showAuditCreatePopup = true
    },
    onCreateAudit (audit) {
      this.auditRecords.unshift(audit)
    },
    onEditAudit ({target, upcs}) {
      this.$set(target, 'upcs', upcs)
    },
    async confirmAudit (item) {
      if (!confirm('Are you sure to confirm this audit?')) return Promise.resolve()
      await this.$store.dispatch('updateAudit', {status: 'done', _key: item._key})
      this.$set(item, 'status', 'done')
      this.$set(item, 'lastModifiedTime', new Date())
    },
    async editNote () {
      await this.$store.dispatch('updateAudit', {note: this.note, _key: this.auditRecordInEdit._key})
      this.auditRecordInEdit.note = this.note
      this.note = ''
    }
  }
}
</script>

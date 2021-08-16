<template>
  <v-container fluid>
    <v-layout>
      <v-flex md3 lg2 v-if="!isTenant">                  
        <v-autocomplete
          :items="organizations"
          item-text="organizationId"
          return-object
          v-model="organizationSelected"
          label="Organization ID"
          clearable
          :rules="[fieldIsRequired('Organization')]"
        ></v-autocomplete>
      </v-flex>
      <v-flex md3 lg2 v-else>                  
        <v-autocomplete
          :items="warehouses"
          item-text="warehouseName"
          return-object
          v-model="warehouseSelected"
          label="Warehouse"
          clearable
          :rules="[fieldIsRequired('Warehouse')]"
        ></v-autocomplete>
      </v-flex>
      <v-flex lg1> </v-flex>
      <v-flex md3 lg2 xl1>
        <v-menu
          ref="startPicker"
          lazy
          :close-on-content-click="false"
          v-model="startPicker"
          transition="scale-transition"
          offset-y
          full-width
          :nudge-right="40"
          min-width="290px"
        >
          <template v-slot:activator="{ on }">
            <v-text-field
              label="Start date"
              v-model="startDateFormatted"
              prepend-icon="event"
              v-on="on"
              readonly
            ></v-text-field>
          </template>
          <v-date-picker v-model="startDate" @input="startPicker = false"></v-date-picker>
        </v-menu>
      </v-flex>
      <v-flex md3 lg2 xl1 class="ml-5">
        <v-menu
          ref="endPicker"
          lazy
          :close-on-content-click="false"
          v-model="endPicker"
          transition="scale-transition"
          offset-y
          full-width
          :nudge-right="40"
          min-width="290px"
        >
          <template v-slot:activator="{ on }">
            <v-text-field
              label="End date"
              v-model="endDateFormatted"
              prepend-icon="event"
              v-on="on"
              readonly
            ></v-text-field>
          </template>
          <v-date-picker v-model="endDate" @input="endPicker = false"></v-date-picker>
        </v-menu>
      </v-flex>
      <v-flex class="ml-5"><v-btn color="primary" @click="requestReport" :disabled="!isValid">Export</v-btn></v-flex>
    </v-layout>
    <v-layout>
      <v-flex>
        <v-data-table
          :headers="headers"
          :items="reports"
          item-key="key"
          :pagination.sync="pagination"
          :rows-per-page-items="rowPerPage"
          class="elevation-2 myDense">
          <template v-slot:items="props">
            <td class="subheading">{{ props.index + 1 }}</td>
            <td class="subheading">{{ getEntityId(props.item) }}</td>
            <td class="subheading">{{ toDateString(props.item.startDate) }}</td>
            <td class="subheading">{{ toDateString(props.item.endDate) }}</td>
            <td class="text-xs-center">
              <v-layout>
                <v-flex><v-btn color="primary" flat @click.stop="downloadReport(props.item)" :disabled="!props.item.zipFile">{{props.item.zipFile ? 'Download' : 'Preparing'}}</v-btn></v-flex>
                <v-flex><v-btn dark color="secondary" flat @click.stop="deleteReport(props.item)">Delete</v-btn></v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>

import FormSubmitPopup from './FormSubmitPopup'
import {toPickerDateString, timeTools, checkRules} from '../utils/tools'
import { subDays } from 'date-fns'

export default {
  name: 'PackageReportWarehouse',
  components: {
    FormSubmitPopup
  },
  mixins: [timeTools, checkRules],
  data () {
    return {
      headers: [
        { text: 'Index', align: 'left', sortable: false, value: 'id' },
        { text: 'Organization ID', align: 'left', sortable: false, value: 'title' },
        { text: 'Start date', align: 'left', sortable: true, value: 'startDate' },
        { text: 'End date', align: 'left', sortable: true, value: 'endDate' },
        { text: 'Action', value: 'createTime', align: 'center', sortable: false, width: '10%' }
      ],
      startDatePicker: false,
      endDatePicker: false,
      addReportDialog: false,
      rowPerPage: [10, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'createTime',
        descending: true
      },
      startDate: toPickerDateString(new Date()),
      endDate: toPickerDateString(new Date()),
      startPicker: false,
      startDateFormatted: '',
      endPicker: false,
      endDateFormatted: '',
      organizationSelected: null,
      warehouseSelected: null
    }
  },
  watch: {
    'startDate': {
      handler: function (value) {
        this.startDateFormatted = this.formatDate(value)
      },
      immediate: true
    },
    'endDate': {
      handler: function (value) {
        this.endDateFormatted = this.formatDate(value)
      },
      immediate: true
    }
  },
  computed: {
    reports () {
      return this.$store.getters.packageReports
    },
    organizations () {
      return this.$store.getters.warehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    warehouses () { 
      return this.$store.getters.warehouses.filter(item => item.warehouseName !== 'Others')
    },
    isTenant () {
      return !!this.$store.getters.activeOrganization
    },
    isValid () {
      return this.organizationSelected || this.warehouseSelected
    },
    isExceedOneMonth () {
      return new Date(this.startDate) <= subDays(new Date(this.endDate), 32)
    }
  },
  methods: {
    getEntityId (item) {
      return this.organizations.find(tenant => tenant.key === item.tenantKey)['organizationId']
    },
    deleteReport (item) {
      if (!confirm('Are you sure to delete this report?')) return Promise.resolve()
      return this.$store.dispatch('deletePackageReportWarehouse', item)
    },
    requestReport () {
      if (this.reports.length >= 10) return alert('Only allow maximum 10 active reports, please delete old reports before adding new one.')
      if (this.isExceedOneMonth) return alert('Export period limits to 31 days maximum per request.')
      this.addReport()
    },
    addReport () {
      let payload = {
        tenantName: this.organizationSelected.organizationId,
        tenantKey: this.organizationSelected.key,
        timeZoneOffset: new Date().getTimezoneOffset(),
        startDate: this.startDate,
        endDate: this.endDate
      }
      return this.$store.dispatch('addPackageReportWarehouse', payload)
    },
    downloadReport (item) {
      item.zipFile && this.$store.dispatch('downloadFile', {
        fullPath: item.zipFile, 
        name: `report_${item.startDate}_${item.endDate}.xlsx`
      })
    }
  }
}
</script>

<template>
  <v-container>
    <v-layout align-center justify-start row fill-height class="subheading" v-if="error">
      <v-flex style="color: red;">
         {{error}}
      </v-flex>
    </v-layout>
    <v-layout align-center justify-start row fill-height>
      <v-flex class="ml-4">
        <v-btn color="primary" flat @click.stop="downloadTemplate">
          <v-icon dark large class="mx-2">cloud_download</v-icon>
          Download template
        </v-btn>
      </v-flex>
    </v-layout>
    <v-divider></v-divider>
    <v-layout style="height: 100px;"></v-layout>
    <v-layout sm12 md6>
      <v-flex sm12 md6>
        <UploadFileWidget
          v-model="uploadedFiles"
          type="packages"
          :maxFiles="1"
          :removeFilesUponUnmounted="uploadedFiles.length > 0"
          :disabled="status === 'processing' || error !== null"
          :clearFiles="clearFiles"
          :acceptTypes="['.csv', '.xls', '.xlsx']"></UploadFileWidget>
      </v-flex>
      <v-flex>
        <LoaderButton
          :buttonText="status === 'ready' ? 'Start' : status"
          :disabled="!this.uploadedFiles.length || status === 'processing' || error"
          :promiseAwait="processFile"
          class="my-4"></LoaderButton>
      </v-flex>
    </v-layout>
    <v-layout sm12 md6>
      <v-progress-linear :indeterminate="status === 'processing'"></v-progress-linear>
    </v-layout>
    <div class="status-area">
      <v-layout align-start justify-center row fill-height class="subheading">
        <v-flex sm1>Status:</v-flex>
        <v-flex :style="statusColor">{{!uploadedFiles.length && status !== 'processing' ? result : status}}</v-flex>
      </v-layout>
    </div>
    <v-layout column sm6>
      <v-flex>*Note:</v-flex>
      <v-flex>1. Don't change or remove the first line in the template</v-flex>
      <v-flex>2. Please ensure the correctness and completeness of the content in the upload file. </v-flex>
      <v-flex>3. If you need better warehouse service that can help you remove duplicate data, handle packages faster and reliably, please signup preferred warehouse.</v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import LoaderButton from './LoaderButton'
import UploadFileWidget from './UploadFileWidget'

export default {
  name: 'TenantUploadPackage',
  components: {
    LoaderButton,
    UploadFileWidget
  },
  data () {
    return {
      status: 'ready', // can be 'ready', 'processing'
      uploadedFiles: [],
      result: '',
      clearFiles: false
    }
  },
  computed: {
    error () {
      let lastWarehouse = this.$store.getters.warehouses && this.$store.getters.warehouses.length && this.$store.getters.warehouses.slice(-1)[0]
      return !lastWarehouse || lastWarehouse.warehouseName !== 'Others' || lastWarehouse.sites.length === 0 ? 'In order to upload packages, a self storage must be created first' : null
    },
    statusColor () {
      return !this.uploadedFiles.length && this.status !== 'processing' && this.result.includes('failed') ? 'color: red;' : ''
    }
  },
  methods: {
    reset () {
      this.status = 'ready'
      this.uploadedFiles = []
      this.clearFiles = true
    },
    readyToProcess () {
      this.status = 'processing'
      this.clearFiles = false
    },
    downloadTemplate () {
      this.$store.dispatch('downloadFile', {fullPath: 'templates/packages-template.xlsx', name: 'packages-template.xlsx'})
    },
    processFile () {
      // todo check file type
      if (this.uploadedFiles.length) {
        this.readyToProcess()
        return this.$store.dispatch('processPackageFile', this.uploadedFiles[0])
          .then((rtn) => {
            this.reset()
            this.result = `Process finished. ${rtn.totalItems} items have been added`
          })
          .catch(error => {
            this.reset()
            let errMessage = error.message
            this.result = `Process failed. ${errMessage}`
          })
      } else {
        return Promise.resolve(0)
      }
    }
  }
}
</script>

<style>
.status-area {
  height: 240px;
}
</style>

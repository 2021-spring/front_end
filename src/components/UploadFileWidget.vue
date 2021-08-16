<template>
  <v-container fluid  v-if="!small && !icon">
    <v-layout>
      <v-flex sm12 md4>
        <v-btn flat large color="primary" class="my-1" title="upload labels" :disabled="files.length >= maxFiles || disabled" @click="$refs.fileInput.click()">
          <v-icon dark large class="mx-2">cloud_upload</v-icon>
          Upload file (max {{ maxFiles }} files)
          <input 
            ref="fileInput"
            class="upload-file"
            type="file"
            :multiple="maxFiles > 1"
            :accept="acceptTypes.join(',')"
            @click="clearSelectionCache" 
            @change="fileSelected"
          />
        </v-btn>
      </v-flex>
      <v-flex sm12 md8>
        <v-layout align-center justify-end v-for="(item, index) in files" :key="item.file.name + index">
          <v-flex xs12 sm8 md8 class="text-lg-right text-md-right">
            <v-layout row justify-space-between px-2>
              <span class="mr-2 text-xs-right" style="width: order-sm6em;">{{index + 1}}/{{files.length}}</span>
              <span>{{item.metadata.name}}</span>
            </v-layout>
          </v-flex>
          <v-flex xs6 sm1 md1>
            {{item.file.prettySize}}
          </v-flex>
          <v-flex xs6 sm2 md1 class="ml-2">
            <v-progress-circular
              :size="20"
              :width="3"
              :rotate="360"
              :value="item.task.progress"
              color="teal"
              class="ml-1"
              v-if="item.task.snapshot.state === 'running' && item.task.progress !== 100"
            >
            </v-progress-circular>
            <v-tooltip
              top
              v-else-if="item.task.snapshot.state === 'error'" 
            >
              <template v-slot:activator="{on}">
                <v-icon
                  v-on="on"
                  color="primary" 
                  @click="retryUploadFile(item)"
                >refresh</v-icon>
              </template>
              <span>retry upload</span>
            </v-tooltip>
            <v-icon color="teal" class="ml-1" v-else>done</v-icon>
          </v-flex>
          <v-flex xs12 sm3 md1 v-if="!disabled">
            <v-btn 
              dark 
              small 
              color="red" 
              icon 
              flat 
              @click.stop="removeFileFromList(item, index)"
              :disabled="isDisableCancelBtn"
            >
              <v-icon dark>cancel</v-icon>
            </v-btn>
          </v-flex>
        </v-layout>
      </v-flex>
    </v-layout>
  </v-container>
  <v-btn
    color="primary"
    :icon="icon"
    :flat="icon"
    :disabled="files.length >= maxFiles"
    @click="$refs.fileInput.click()"
    v-else-if="small || icon"
    :loading="smallBtnUploadStatus === 'uploading' || loading"
  >
    <slot>
      <v-icon>attachment</v-icon>
    </slot>
    <input ref="fileInput" class="upload-file" type="file" :multiple="maxFiles > 1" :accept="acceptTypes.join(',')" v-on:click="clearSelectionCache" v-on:change="fileSelected" />
  </v-btn>
</template>

<script>
import * as firebase from 'firebase/app'
import {imageResize} from '@/utils/tools'

const STATUS = {
  READY: 'ready',
  SUCCESS: 'success',
  PROCESSING: 'processing',
  ERROR: 'error'
}

export default {
  name: 'UploadFileWidget',
  data () {
    return {
      files: [],
      state: STATUS.READY
    }
  },
  beforeDestroy () {
    if (this.removeFilesUponUnmounted) {
      return this.removeRemoteFiles()
    }
  },
  computed: {
    smallBtnUploadStatus () {
      let status = ''
      if (this.files.length === 0) {
        status = 'waiting'
      }
      if (this.files.length > 0) {
        if (
          this.files[0].task
          && this.files[0].task.progress
          && this.files[0].task.progress !== 100
        ) status = 'uploading'
        else status = 'done'
      }
      return status
    }
  },
  watch: {
    clearFiles (value) {
      this.$$cleanData()
    },
    removeFiles (value) {
      if (value) {
        return this.removeRemoteFiles()
      }
    },
    state (status) {
      this.$emit('filesStatus', status)
    }
  },
  methods: {
    removeRemoteFiles () {
      if (!this.files.length) return Promise.resolve('ok')
      console.log('remove file now')
      let promises = this.files.map(file => {
        return this.deleteFileFromStorage(file)
      })
      
      return Promise.all(promises)
        .then(rtn => {
          this.files = []
          this.$emit('input', [])
        })
    },
    clearSelectionCache (e) {
      e.target.value = null
      this.emitFilesUploadStatus()
    },
    fileSelected (e) {
      if (this.maxFiles && (e.target.files.length + this.files.length > this.maxFiles)) {
        return alert(`The files qty is large than max files limit`)
      }
      Object.values(e.target.files).forEach(newFile => {
        if (this.checkFilenameExists(newFile)) {
          this.$store.dispatch('showToast', {info: `file exists: ${newFile.name}`})
          console.log('file already selected: ', newFile.name)
          return
        }
        if (this.isResizeImage && newFile.type.includes('image')) {
          imageResize(newFile, {width: 1680}, (img) => {
            this.uploadFile(img)
          }) 
        } else {
          this.uploadFile(newFile)
        }
      })      
    },
    uploadFile (newFile) {
      newFile.prettySize = newFile.size > 1048576 ?
        (Math.round(newFile.size / 1048576) + ' ' + 'MB') 
        :
        newFile.size > 1024 ? 
          (Math.round(newFile.size / 1024) + ' ' + 'KB')
          :
          newFile.size + ' ' + 'B'
      let fileSizeLimit = newFile.type.includes('video/mp4') ? 10485760 : 5242880
      if (newFile.size > fileSizeLimit) {
        this.$store.dispatch('showToast', {info: `${newFile.name} is too big, can't upload a file bigger than ${fileSizeLimit / 1048576} MB`, level: 'error'})
        return 
      }
      return this.$store.dispatch('uploadFiles', {newFile, type: this.type, newName: this.getFileName(newFile.name)})
        .then(rtn => {
          this.listenToFileUpload(rtn)
          this.files.push(rtn)
          this.emitFilesUploadStatus()
        })
    },
    checkFilenameExists (file) {
      const { name, size } = file
      return this.files.findIndex(item => item.file.name === name && item.file.size === size) !== -1
    },
    getFileName (fileName, index = 0) {
      let fileElements = fileName.split('.')
      let fileExt = fileElements.pop()
      let fileToCheck = index ? fileElements.join('.') + index + '.' + fileExt : fileName
      if (this.files.findIndex(item => item.metadata.name === fileToCheck) !== -1) {
        return this.getFileName(fileName, ++index)
      }

      return fileToCheck
    },
    /**
     * @param {{task: firebase.storage.UploadTask}} file
     */
    listenToFileUpload (file) {
      // Listen for state changes, errors, and completion of the upload.
      file.task.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          this.$set(file.task, 'progress', progress)
          this.$emit('input', this.getFiles())
        }, (error) => {
          // A full list of error codes is available at
          // https://firebase.google.com/docs/storage/web/handle-errors
          switch (error.code) {
            case 'storage/retry-limit-exceeded':
            case 'storage/unauthorized': // User doesn't have permission to access the object
            case 'storage/canceled': // User canceled the upload 
            case 'storage/unknown': // Unknown error occurred, inspect error.serverResponse
              
              break
            default:
              break
          }
          console.error(`error upload file (${file.file.name}): ${error.message.substring(18)}`)
          this.state = STATUS.ERROR
          this.$emit('error', {code: error.code, file})
          this.$store.dispatch('showToast', {info: `upload file failed`})
        }, () => {
          // Upload completed successfully, now we can get the download URL
          file.task.snapshot.ref.getDownloadURL().then(downloadURL => {
            file.metadata.downloadURL = downloadURL
            console.log('File available at', downloadURL)
          })
          this.emitFilesUploadStatus()
        })
    },
    /**
     * @param {{task: firebase.storage.UploadTask}} file
     */
    removeFileFromList (file, index, noPrompt) {
      if (noPrompt || confirm('Are you sure to remove this file?')) {
        file.task && file.task.cancel()
        if (file.task.snapshot.state === 'success') {
          this.deleteFileFromStorage(file)
            .catch(error => {
              if (error.code === 'storage/object-not-found') {
                // this.files.splice(index, 1)
              } else {
                this.$store.dispatch('showToast', {info: `delete file failed`})
                console.log('delete file failed: ', error.code)
              }
              return true
            })
            .then(rtn => {
              this.files.splice(index, 1)
              this.$emit('input', this.getFiles())
            })
        } else {
          this.files.splice(index, 1)
          this.$emit('input', this.getFiles())
        }
        this.emitFilesUploadStatus()
      }
    },
    deleteFileFromStorage (file) {
      return this.$store.dispatch('removeFile', file.metadata.fullPath)
        .catch(error => {
          console.error('error removing file: ', error)
        })
    },
    getFiles () {
      return this.files
        .filter(file => {
          return file.task.progress === 100
        })
        .map(file => {
          return file.metadata
        })
    },
    removeAllFiles () {
      return Promise.all(this.files.map(file => this.deleteFileFromStorage(file)))
        .then(arr => {
          this.$emit('input', [])
          this.files = []
        })
    },
    emitFilesUploadStatus () {
      let isFileUploading = false
      let hasError = false
      this.files.forEach(({task, file, metadata}) => {
        const {snapshot} = task
        snapshot.state === 'running' && (isFileUploading = true)
        snapshot.state === 'error' && (hasError = true)
      })
      if (isFileUploading) {
        this.state !== STATUS.PROCESSING && (this.state = STATUS.PROCESSING)
      } else {
        const state = hasError ? STATUS.ERROR : STATUS.SUCCESS
        this.state !== state && (this.state = state)
      }
      this.$emit('filesStatus', this.smallBtnUploadStatus)
    },
    /**
     * @param {{task: firebase.storage.UploadTask, file: File, metadata: object}} file
     */
    retryUploadFile (file) {
      return this.$store.dispatch('uploadFiles', {newFile: file.file, type: this.type, newName: this.getFileName(file.file.name)})
        .then(rtn => {
          file.task = rtn.task
          file.metadata = rtn.metadata
          this.listenToFileUpload(file)
          this.emitFilesUploadStatus()
        })
    },
    removeSingleFile (deleteFile) {
      this.$store.dispatch('removeFile', deleteFile.fullPath)
      this.files = this.files.filter(file => file.metadata.name !== deleteFile.name)
      this.$emit('input', this.getFiles())
    },
    $$cleanData () {
      this.state = STATUS.READY
      this.files = []
      this.$emit('input', [])
    }
  },
  props: {
    value: [Object, Array],
    type: String,
    removeFilesUponUnmounted: Boolean, // when confirmed, the uploaded file won't get deleted upon closing
    maxFiles: Number,
    disabled: {
      type: Boolean,
      default: false
    },
    isResizeImage: {
      type: Boolean,
      default: true
    },
    clearFiles: [Boolean, Number], // clear files array, but don't remove file on remote server
    removeFiles: [Boolean, Number], // clear files array, and remove file on remote server
    acceptTypes: {
      type: Array,
      default: function () {
        return ['*']
      }
    },
    small: Boolean,
    icon: Boolean,
    loading: Boolean,
    isDisableCancelBtn: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
input[type=file].upload-file {
  display: none;
  top: 0;
  right: 0;
  width: 0;
  text-align: right;
  filter: alpha(opacity=0);
  opacity: 0;
  outline: none;
  cursor: inherit;
}
</style>

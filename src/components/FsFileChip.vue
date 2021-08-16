<template>
  <div class="d-inline"
    :style=" isExpand && {
      width: width ? width : 'auto',
      maxWidth: maxWidth ? maxWidth : 'auto'
    }"
  > 
    <div>
      <template v-if="(file.type || '').includes('image')">
        <v-chip dark color="info" v-if="!isExpand" @click="showImage"><v-icon class="mr-1">image</v-icon>{{file.name}}</v-chip>
        <v-img v-else :src="filePath" :lazy-src="filePath" v-bind="$attrs" contain>
          <template v-slot:placeholder>
            <v-layout fill-height align-center justify-center ma-0>
              <v-progress-circular indeterminate color="grey lighten-5">
              </v-progress-circular>
            </v-layout>
          </template>
          <v-layout pa-1 column fill-height>
            <v-flex text-xs-right>
              <v-tooltip top>
                <template v-slot:activator="{ on }">
                  <v-btn style="background-color: rgba(0, 0, 0, .2);" icon v-on="on" @click.stop="isExpand = false">
                    <v-icon color="white">keyboard_arrow_up</v-icon>
                  </v-btn>
                </template>
                <span>Close this image</span>
              </v-tooltip>
            </v-flex>
            <v-spacer></v-spacer>
            <v-flex shrink text-xs-right>
              <v-tooltip bottom>
                <template v-slot:activator="{ on }">
                  <v-btn style="background-color: rgba(0, 0, 0, .2);" icon v-on="on" @click.stop="link()">
                    <v-icon color="white" flat>zoom_in</v-icon>
                  </v-btn>
                </template>
                <span>Open in new tab</span>
              </v-tooltip>
              <v-tooltip  bottom>
                <template v-slot:activator="{ on }">
                  <v-btn style="background-color: rgba(0, 0, 0, .2);" icon v-on="on" @click.stop="download()">
                    <v-icon color="white" flat>save_alt</v-icon>
                  </v-btn>
                </template>
                <span>Save this image</span>
              </v-tooltip>
            </v-flex>
          </v-layout>
        </v-img>
      </template>
      <template v-else-if="(file.type || '').includes('video/mp4')" >
        <v-chip dark color="info" v-if="!isExpand" @click="showImage"><v-icon class="mr-1">image</v-icon>{{file.name}}</v-chip>
        <video v-else width="480" controls autoplay>
          <source :src="filePath" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
      </template>
      <template v-else-if="(file.type || '').includes('application/pdf')">
        <v-chip dark color="info" v-if="!isExpand" @click.stop="download"><v-icon class="mr-1" @click.stop="showImage">remove_red_eye</v-icon> {{file.name}}</v-chip>
        <div v-else class="text-xs-right">
          <v-btn style="background-color: rgba(0, 0, 0, .2)" icon @click.stop="isExpand = false">
            <v-icon color="white">keyboard_arrow_up</v-icon>
          </v-btn>
          <embed :src="filePath" type="application/pdf" width="100%" height="600px">
        </div>
      </template>
      <v-chip v-else dark color="info" @click.stop="download" ><v-icon>attachment</v-icon>{{ file.name }}</v-chip>
    </div>
    <div class="text-xs-center red--text" v-if="errorMessage">{{errorMessage}}</div>
  </div>
</template>

<script>
import {getFileUrl} from '@/utils/dbAccessor'

export default {
  name: 'FsFileChip',
  data () {
    return {
      isExpand: false,
      filePath: '',
      errorMessage: ''
    }
  },
  methods: {
    showImage () {
      return this.setImagePath()
        .then((expandable) => {
          this.isExpand = expandable
        })
    },
    async setImagePath () {
      if (typeof this.file === 'string') {
        this.filePath = this.file
        return true
      }
      if (this.file && this.file.fullPath) {
        return getFileUrl(this.file.fullPath)
          .then((url) => {
            if (!url) {
              return false
            }
            this.filePath = url
            return true
          })
          .catch(err => {
            this.handleError(err)
          })
      }
      return false
    },
    link () {
      return window.open(this.filePath, '_blank')
    },
    download () {
      return this.$store.dispatch('downloadFile', this.file)
        .catch(err => {
          this.handleError(err)
        })
    },
    handleError (err) {
      if (err.code === 'storage/object-not-found') {
        this.errorMessage = 'File not found'
      } else {
        this.errorMessage = err.code
      }
      throw err
    }
  },
  props: {
    file: Object,
    width: String,
    maxWidth: String
  }
}
</script>

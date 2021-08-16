<template>
  <SimpleTextPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    hideLftBtn
    hideRgtBtn
    large
    ref="simpleTextPopup"
    scrollToBottom>
    <template v-slot:input>
      <v-container
        fluid
        style="min-height: 0;"
        grid-list-lg
      >
        <v-layout row wrap>
          <v-flex xs12 v-if="$slots.issue">
            <slot name="issue" />            
          </v-flex>
          <v-flex xs12 v-for="(item, index) in displayComments" :key="'item' + index">
            <v-card :class="getChatClass(item)" hover raised>
              <v-card-text>
                <div class="cardTitle">
                  <span :class="item.userKey === userKey ? 'chatroom_card_self' : ''">{{ item.name }}</span> <span>{{ dateForm(item.createTime) }}</span>
                  <v-btn icon class="delete_icon"
                    v-if="index === displayComments.length - 1 &&
                      item.userKey === uid &&
                      !readOnly &&
                      item.createTime && 
                      (!createTime || (!item.initialComment && createTime <= item.createTime))"
                    @click.stop="deleteComment(index)"
                  >
                    <v-icon color="lighten-2">delete</v-icon>
                  </v-btn>
                </div>
                <div class="cardText"><span v-if="item.isResolution" style="color: blue;">Resolution: </span>{{ item.content }}</div>
                <v-layout v-if="item.type === 'file'" row wrap>
                
                  <FsFileChip 
                    v-if="item.file"
                    :file="item.file"
                    :key="'file' + index"
                    width="100%"
                    aspect-ratio="1.7"
                    class="ma-2"
                  />
                  <FsFileChip 
                    v-else
                    v-for="file in item.files"
                    :file="file"
                    :key="file.name"
                    width="100%"
                    aspect-ratio="1.7"
                    class="ma-2"
                  />
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
          
        </v-layout>
      </v-container>
    </template>
    <template v-slot:popupAction>
      <v-layout row wrap>
        <v-flex xs12 v-if="!readOnly" mx-2>
          <v-layout>
            <v-flex style="text-align: right;">{{ 'Message quantity: ' + displayComments.length + '/' + maxMsgQty }}</v-flex>
          </v-layout>
          <v-textarea
            outline
            :label="name"
            hint="Ctrl+Enter to send"
            v-model="content"
            :counter="maxTextQty"
            auto-grow
            rows="3"
            @keyup.ctrl.enter.stop="submitComment"
          >
            <template v-if="isCommentWithFile" v-slot:append>
              <template v-if="uploadedFiles.length <= 3">
                <v-chip 
                  v-for="file in uploadedFiles" 
                  :key="file.name"
                  :value="isCommentWithFile"
                  close
                  @input="v => !v && removeSingleUploadFile(file)"
                >
                  {{file.name}}
                </v-chip>
              </template>
              <template v-else>
                <v-menu offset-y>
                  <v-chip slot="activator">attachments: {{uploadedFiles.length}}</v-chip>
                  <v-list>
                    <v-list-tile v-for="file in uploadedFiles" :key="file.name">
                      <v-layout row justify-space-around align-baseline>
                        <v-flex>{{ file.name }}</v-flex>
                        <v-flex text-xs-right >
                          <v-btn small flat color="primary" icon @click="removeSingleUploadFile(file)">
                            <v-icon >close</v-icon>
                          </v-btn>
                        </v-flex>
                      </v-layout>
                    </v-list-tile>
                  </v-list>
                </v-menu>
              </template>
            </template>
          </v-textarea>
        </v-flex>
        <v-flex xs12 mx-2>
          <v-layout row wrap justify-end>
            <v-flex xs7 text-xs-left >
              <v-layout row wrap>
                <v-flex xs2>
                  <v-btn color="primary" flat @click.stop="$refs.simpleTextPopup.firstMethod()">Close</v-btn>
                </v-flex>
                <v-flex xs10 v-if="$slots.operation">
                  <slot name="operation" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex xs2>
              <v-checkbox
                v-if="!readOnly && lastReadTime"
                style="margin-top: 0"
                label="Mark unread"
                v-model="markAsUnread"
              ></v-checkbox>
            </v-flex>
            <v-flex xs3 text-xs-right>
              <UploadFileWidget
                v-if="enableFileUpload && !readOnly"
                v-model="uploadedFiles"
                ref="fileUploader"
                type="comments"
                :maxFiles="10"
                :clearFiles="uploadedFilesClear"
                icon
              />
              <v-btn small color="primary" @click.stop="submitComment" :disabled="hasNoContent || isSending" :loading="isSending">Send</v-btn>
            </v-flex>
          </v-layout> 
        </v-flex>

      </v-layout>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import UploadFileWidget from './UploadFileWidget'
import FsFileChip from './FsFileChip'
import { toTimestampString } from '@/utils/tools'

/*
The dispatch action should expect the payload with following structure
{
  comments
  docPath,
  commentsField
}

*/
export default {
  name: 'ChatRoom',
  components: {
    SimpleTextPopup,
    UploadFileWidget,
    FsFileChip
  },
  data () {
    return {
      readonly: false,
      content: '',
      markAsUnread: false,
      isSending: false,
      mailContents: [], // like a queue list to be sent to other, if sent, clear this. 
      uploadedFiles: [],
      rtComments: [],
      subscribed: '',
      uploadedFilesClear: 0
    }
  },
  mounted () {
    this.createConnection && this.buildCommentsChannel()
  },
  beforeDestroy () {
    if (this.value && !this.readOnly && !this.markAsUnread && !this.noLastRead) {
      this.$store.dispatch('updateCommentLastRead', { docPath: this.docPath, commentsField: this.commentsField })
    }
    if (this.markAsUnread &&
      this.comments.length >= 1 &&
      this.lastReadTime >= this.comments[this.comments.length - 1].createTime
    ) {
      this.$store.dispatch('updateCommentLastRead', {
        docPath: this.docPath,
        commentsField: this.commentsField,
        readTime: new Date(this.comments[this.comments.length - 1].createTime - 1000)
      })
    }
    if (this.isCommentWithFile) {
      this.removeUploadFiles()
    }
    this.sendNewCommentsByEmail()
    if (this.createConnection) {
      this.subscribed && this.subscribed()
    }
  },
  watch: {
    'displayComments.length': function (cur, old) {
      if (cur > old) {
        this.$nextTick(this.$refs.simpleTextPopup.scrollBottom())
      }
    }
  },
  computed: {
    isAdmin () {
      return !!(this.$store.getters.user || {}).isAdmin
    },
    name () {
      if (this.nickName) return this.nickName
      if (this.$store.getters.userExtra) return this.$store.getters.userExtra.name
      return 'IT support'
    },
    uid () {
      return this.$store.getters.uid
    },
    activeOrganization () {
      return this.$store.activeOrganization
    },
    tenantLimitedInfo () {
      return this.chatReciever.type === 'tenant' ?
        this.$store.getters.allTenantLimitedInfo[this.chatReciever.key] :
        {}
    },
    isSendEmail () {
      return (this.sendWithEmail &&
        this.chatReciever.type &&
        (((this.chatReciever.type === 'tenantPayment' || this.chatReciever.type === 'tenantPropose') && 
            this.tenantLimitedInfo.recieveEmailfromComment !== false) || 
          (this.chatReciever.type === 'userPayment' || this.chatReciever.type === 'userPropose')
        ) && this.chatReciever.key
      )
    },
    isCommentWithFile () {
      return this.uploadedFiles.length > 0
    },
    displayComments () {
      return this.createConnection ? this.rtComments : this.comments
    },
    hasNoContent () {
      return !this.content.length && !this.uploadedFiles.length
    },
    userKey () {
      return this.$store.getters.uid
    }
  },
  methods: {
    getChatClass (item) {
      if (this.createTime && item.createTime >= this.createTime) {
        return 'chatroom_card_after_createTime'
      } else {
        return (item.name === 'IT support' && this.isAdmin) || item.name === (this.$store.getters.userExtra && this.$store.getters.userExtra.name) ? 'chatroom_card_main' : ''
      }
    },
    dateForm (timestamp) {
      if (typeof timestamp === 'string') {
        timestamp = new Date(timestamp)
      }
      return timestamp ? toTimestampString(timestamp) : ''
    },
    fileTypeComment (files) {
      let current = new Date()
      if (this.createTime && current < this.createTime) {
        // there is may different between server time and local time
        current = this.createTime
      }
      let fileComment = {
        name: this.name,
        userKey: this.uid,
        type: 'file',
        content: this.content,
        files,
        createTime: current
      }
      return fileComment
    },
    submitComment () {
      if (this.isSending) return
      this.isSending = true
      let current = new Date()
      if (this.createTime && current < this.createTime) {
        // there is may different between server time and local time
        current = this.createTime
      }
      let comment = this.isCommentWithFile ? 
        this.fileTypeComment(this.uploadedFiles) :
        ({ name: this.name, userKey: this.uid, content: this.content, createTime: current })

      let payload = {
        comment,
        docPath: this.docPath,
        commentsField: this.commentsField
      }

      if (this.docPath.some(path => !path)) {
        alert('This conversation has been removed. It may be because the item has been processed or canceled.')
        this.isSending = false
        return this.$emit('input', false)
      }

      if (this.comments.length + 1 > this.maxMsgQty) {
        this.isSending = false
        return alert('max number of messages exceed!!!')
      }
      if (this.content.length > this.maxTextQty) {
        this.isSending = false
        return alert('max length of content exceed!!!')
      }
      return this.$store.dispatch('addComment', payload)
        .then(() => {
          this.$emit('add', comment)
          this.mailContents.push(comment.content)
          this.content = ''
          this.isSending = false
          if (this.isCommentWithFile) {
            this.uploadedFilesClear += 1 // change uploader status to clear cache files
          }
        })
    },
    deleteComment (index) {
      let comment = this.displayComments.slice(index, index + 1)[0]
      let payload = {
        comment,
        docPath: this.docPath,
        commentsField: this.commentsField
      }
      if (confirm('Are you sure to delete this comment?')) {
        return this.$store.dispatch('removeComment', payload)
          .then(() => {
            comment.file && this.$store.dispatch('removeFile', comment.file.fullPath)
            this.$emit('delete', comment)
            this.content = ''
            if (this.mailContents.includes(comment.content)) {
              this.mailContents = this.mailContents.filter(v => !(v === comment.content))
            }
          })
      }
    },
    sendNewCommentsByEmail () {
      if (!this.isSendEmail) return 
      if (this.mailContents.length === 0) return 

      let payload = {
        senderName: this.name,
        reciever: this.chatReciever,
        content: this.mailContents,
        emailContext: this.emailContext
      }

      this.$store.dispatch('sendNewCommentsByEmail', payload)
    },
    downloadFile (file) {
      file && this.$store.dispatch('downloadFile', file)
    },
    removeUploadFiles () {
      if (this.uploadedFiles.length) {
        return this.$refs.fileUploader.removeAllFiles()
      }
    },
    removeSingleUploadFile (file) {
      return this.$refs.fileUploader.removeSingleFile(file)
    },
    getCommentsRT (rtDocData) {
      const comments = rtDocData[this.commentsField]
      this.rtComments = comments || []
      this.$emit('realtimeComments', comments)
    },
    async buildCommentsChannel () {
      this.subscribed = await this.$store.dispatch('subscribeComments', {
        docPath: this.docPath, 
        cbFunc: this.getCommentsRT,
        commentsField: this.commentsField
      })
    }
  },
  props: {
    value: Boolean,
    title: {
      type: String,
      default: 'Comments'
    },
    lastReadTime: Date,
    docPath: Array,
    addAction: String,
    removeAction: String,
    updateLastReadAction: String,
    comments: {
      type: Array,
      default: () => []
    },
    maxMsgQty: {
      type: Number,
      default: 200
    },
    maxTextQty: {
      type: Number,
      default: 500
    },
    readOnly: Boolean,
    createTime: null,
    sendWithEmail: {
      type: Boolean,
      default: false
    },
    chatReciever: {
      type: Object,
      default: () => {
        return {type: '', key: ''}
      }
    },
    emailContext: {
      type: Object,
      default: () => {
        return {}
      }
    },
    nickName: {
      type: String,
      default: ''
    },
    enableFileUpload: {
      type: Boolean,
      default: false
    },
    createConnection: {
      type: Boolean,
      default: false
    },
    noLastRead: Boolean,
    commentsField: {
      type: String,
      default: 'comments'
    }
  }
}
</script>

<style>
.cardTitle {
  font-weight: bold;
  font-size: 15px;
}

.cardText {
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.class_input {
  position: fixed;
  top: 10px;
}

.delete_icon {
  float: right;
}

.chatroom_card_main {
  border-top: 4px solid rgb(0, 123, 255);
}

.chatroom_card_self {
  color: rgb(27, 160, 15);
}

.chatroom_card_after_createTime {
  border-top: 4px solid rgb(27, 160, 15);
}
</style>

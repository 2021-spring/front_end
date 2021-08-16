<template>
  <v-tooltip top>
    <template v-slot:activator="{ on }">
      <span 
        v-if="isWarehouse || checkPackageNote"
        @click="$emit('click', value)"
        class="text-xs-center"
        v-on="on"
      >
        <v-btn
          v-if="icon === 'add'"
          flat
          icon
          dark
          :color="iconColor"
        >
          <v-icon v-text="icon" size="20" />
        </v-btn>
        <v-btn
          flat
          icon v-else>
          <v-icon :color="iconColor" v-text="icon" />
        </v-btn>
      </span>
    </template>
    <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px"  v-text="showFlagText" />
  </v-tooltip>
</template>

<script>
export default {
  name: 'PackageNoteIconWidget',
  computed: {
    isWarehouse () {
      return this.$store.getters.activeWarehouse
    },
    checkPackageNote () {
      return (
        this.value.isAbnormal ||
        (this.value.note && this.value.note.length) ||
        (this.value.resolveNote && this.value.resolveNote.length) ||
        (Array.isArray(this.value.comments) && this.value.comments.length) ||
        (Array.isArray(this.value.attachments) && this.value.attachments.length)
      )
    },
    showFlagText () {
      return (
        (this.value.note +
          (this.value.resolveNote ? ` | ${this.value.resolveNote}` : '')) ||
        this.lastComment ||
        (this.icon === 'add' && 'Add comments') ||
        'Open to see detail'
      )
    },
    lastComment () {
      return (
        (this.value.comments &&
          this.value.comments.length &&
          this.value.comments[this.value.comments.length - 1].content) ||
        ''
      )
    },
    iconColor () {
      return this.value.isAbnormal
        ? 'error'
        : this.lastComment.toLowerCase().startsWith('[done]') ||
          !this.checkPackageNote
          ? 'info'
          : 'warning'
    },
    icon () {
      return this.value.isAbnormal ? 'flag' : this.checkPackageNote ? 'comment' : 'add'
    }
  },
  props: {
    value: Object
  }
}
</script>

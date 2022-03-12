<template>
  <FormSubmitPopup
    :title="`Suggestions`"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightButtonText="actionText"
    :rightMethod="onSubmitted"
    medium>
    <template v-slot:input>
      <v-container>
        <slot name="inputText"></slot>
        <v-flex sm6 md4 v-if="!name">
          <v-text-field
            label="Name"
            v-model="nameLocal"
            :rules="[fieldIsRequired('name')]"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm6 md4>
          <v-text-field
            label="Email"
            v-model="emailLocal"
            :rules="[fieldIsRequired('email'), fieldIsEmail()]"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm6 md4>
          <v-text-field
            label="Phone#"
            v-model="phoneLocal"
            :rules="[fieldIsRequired('phone#'), fieldIsPhone()]"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex>
          <v-textarea
            label="Suggestion"
            v-model="comment"
            :rules="[fieldIsRequired('suggestion content')]"
            outline
            rows="8"
            class="thinBox required_field"></v-textarea>
        </v-flex>
      </v-container>
    </template>
  </FormSubmitPopup>
</template> 

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'SuggestionsPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      comment: '',
      emailLocal: '',
      nameLocal: '',
      phoneLocal: ''
    }
  },
  mounted () {
    this.comments = ''
    if (!this.email) {
      this.emailLocal = ''
    } else {
      this.emailLocal = this.email
    }
    if (!this.name) {
      this.nameLocal = ''
    } else {
      this.nameLocal = this.name
    }
    if (!this.phone) {
      this.phoneLocal = ''
    } else {
      this.phoneLocal = this.phone
    }
  },
  watch: {
    email (value) {
      this.emailLocal = this.email
    },
    name (value) {
      this.nameLocal = this.name
    },
    phone (value) {
      this.phoneLocal = this.phone
    }
  },
  methods: {
    onSubmitted () {
      let payload = {
        email: this.emailLocal,
        name: this.nameLocal,
        phone: this.phoneLocal,
        comment: this.comment
      }
      this.actionMethod(payload)
    }
  },
  props: {
    value: Boolean,
    actionText: {
      type: String,
      default: 'Send'
    },
    actionMethod: Function,
    email: String,
    name: String
  }
}
</script>

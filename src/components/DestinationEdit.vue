<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    :rightButtonText="actionText"
    medium>
    <template v-slot:input>
      <v-flex md4>
        <v-text-field
          label="Name"
          class="required_field"
          v-model.trim="name"
          :rules="[fieldIsRequired('Name')]"></v-text-field>
      </v-flex>
      <v-textarea
        label="Content"
        outline
        v-model.trim="content"></v-textarea>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'DestinationEdit',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      name: '',
      content: '',
      disabled: false
    }
  },
  mounted () {
    if (this.destination && JSON.stringify(this.destination) !== '{}') {
      Object.keys(this.$data).forEach(key => {
        this.$data[key] = this.destination[key]
      })
    }
  },
  methods: {
    onSubmitted () {
      let payload = {
        name: this.name,
        content: this.content || ''
      }
      if (this.destination.index || this.destination.index === 0) {
        payload.index = this.destination.index
      }
      this.actionFunc(payload)
    }
  },
  props: {
    value: Boolean,
    title: String,
    destination: Object,
    actionFunc: Function,
    actionText: {
      type: String,
      default: 'Save'
    }
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}
</style>

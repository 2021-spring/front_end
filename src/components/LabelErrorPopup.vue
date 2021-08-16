<template>
  <SimpleTextPopup
    title="Order error log"
    v-model="value"
    @popupClose="$emit('input', false)"
    :hideRgtBtn="true"
    medium>
    
      <template v-slot:input>
        <v-layout v-for="messageItem in messages" :key="messageItem.time" row align-baseline wrap justify-start>
          <v-flex class="text-xs-right" xs3>
            <b>{{toDateYYYYMMDDHHmm(new Date(messageItem.time))}}</b>:
          </v-flex>
          <v-flex class="text-xs-left" xs9 pl-1>
             {{messageItem.message}}
          </v-flex>
        </v-layout>
      </template>
    </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from '@/components/SimpleTextPopup'
import { timeTools } from '@/utils/tools'

export default {
  name: 'LabelErrorPopup',
  components: {SimpleTextPopup},
  mixins: [timeTools],
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    value: Boolean
  }
}
</script>

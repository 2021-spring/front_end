<template>
  <v-autocomplete
    multiple
    :label="label"
    :items="items"
    v-model="selected"
    :item-text="itemText"
    :item-value="itemValue"
  >
    <template v-slot:prepend-item>
      <v-list-tile
        ripple
        @click="toggle"
      >
        <v-list-tile-action>
          <v-icon :color="selected.length > 0 ? 'indigo darken-4' : ''">{{ icon }}</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>Select All</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-divider class="mt-2"></v-divider>
    </template>
    <template v-slot:selection="{ item, index }">
      <v-chip v-if="index <= displayQty"> 
        <span>{{ item[chipText] }}</span>
      </v-chip>
      <span
        v-if="index === (displayQty + 1)"
        class="grey--text caption"
      >(+{{ selected.length - 2 }} others)</span>
    </template>
  </v-autocomplete>
</template>

<script>
import {deepEqual} from '@/utils/tools'

export default {
  name: 'SelectWidget', // support select all
  data () {
    return {
      selected: []
    }
  },
  watch: {
    selected (value) {
      if (deepEqual(value, this.value)) return
      this.$emit('input', value)
    },
    value (value) {
      this.selected = [...value]
    }
  },
  computed: {
    selectedAll () {
      return this.selected.length === this.items.length
    },
    selectedSome () {
      return this.selected.length > 0 && !this.selectedAll
    },
    icon () {
      if (this.selectedAll) return 'check_box'
      if (this.selectedSome) return 'indeterminate_check_box'
      return 'check_box_outline_blank'
    }
  },
  methods: {
    toggle () {
      this.$nextTick(() => {
        if (this.selectedAll) {
          this.selected = []
        } else {
          this.selected = this.items.map(item => item[this.itemValue])
        }
      })
    }
  },
  props: {
    value: Array,
    items: Array,
    label: String,
    itemText: String,
    chipText: String,
    itemValue: String,
    displayQty: {
      type: Number,
      default: 1
    }
  }
}
</script>

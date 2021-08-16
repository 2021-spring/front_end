<template>
  <FormSubmitPopup
    :title="`Please fill in address information`"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    medium
  >
    <template v-slot:input>
      <v-flex md5>
        <v-text-field
          label="Site_name"
          id="Sitename"
          v-model="site.siteName"
          :disabled="editMode && !siteKeyCanEdit"
          :rules="[ fieldIsRequired('Site name'), checkDupSiteName ]"
          class="required_field"></v-text-field> 
      </v-flex>
      <v-text-field
        label="Address line 1"
        id="Address"
        v-model="site.address1"
        :rules="[fieldIsRequired('Address')]"
        class="required_field"></v-text-field>
      <v-text-field
        label="Address line 2"
        id="Address2"
        v-model="site.address2"
        ></v-text-field>
      <v-layout justify-space-between>
        <v-flex md3>
          <v-text-field
            label="City"
            id="City"
            v-model="site.city"
            :rules="[fieldIsRequired('City')]"
            class="required_field"
            ></v-text-field>
        </v-flex>
        <v-flex md3>
          <v-autocomplete
            :items="states"
            v-model="site.state"
            label="State"
            :disabled="editMode && !siteKeyCanEdit"
            id="addressState"
          >
            <template v-slot:item="data">
              <template>
                <v-list-tile-content>
                  <v-list-tile-title :id="data.item">
                    {{data.item}}
                  </v-list-tile-title>
                </v-list-tile-content>
              </template>
            </template>
          </v-autocomplete>
        </v-flex>
        <v-flex md3>
          <v-text-field
            label="Zip code"
            id="Zip code"
            v-model="site.zip"
            :disabled="editMode && !siteKeyCanEdit"
            :rules="[fieldIsRequired('Zip code'), fieldIsZip('Zip code')]"
            class="required_field"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex md5>
          <v-text-field
            v-if="isWarehouse"
            label="Contact"
            id="Contact"
            v-model="site.contact"
            ></v-text-field>
        </v-flex>
        <v-flex md5>
          <v-text-field
            v-if="isWarehouse"
            label="Phone"
            id="Phone"
            v-model="site.phone"
            ></v-text-field>
        </v-flex>
      </v-layout>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'EditAddress',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      site: {
        siteName: '',
        address1: '',
        address2: '',
        state: '',
        city: '',
        zip: '',
        contact: '',
        phone: ''
      },
      siteKeyCanEdit: false
    }
  },
  mounted () {
    Object.assign(this.site, this.address)
    if (this.editMode) {
      this.checkDistribution()
        .then(checkResult => { this.siteKeyCanEdit = !checkResult })
    }
  },
  computed: {
    states () {
      return this.$store.getters.states
    },
    checkDupSiteName () {
      return (v) => !this.siteNames.has(v) || 'Duplicated ID is not allowed'
    }
  },
  methods: {
    onSubmitted () {
      this.actionFunc(this.site, this.address)
    }
  },
  props: {
    value: Boolean,
    actionFunc: Function,
    isWarehouse: {
      type: Boolean,
      default: () => false
    },
    address: {
      type: Object,
      default: () => {}
    },
    editMode: {
      type: Boolean,
      default: () => false
    },
    siteNames: Set,
    checkDistribution: {
      type: Function,
      default: () => Promise.resolve()
    }
  }
}
</script>

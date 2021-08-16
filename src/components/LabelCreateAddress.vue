<template>
  <FormSubmitPopup
    :title="`Please fill in address information`"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    medium>
    <template v-slot:input>
      <v-layout justify-space-between>
        <v-flex md5>
          <v-text-field
            label="Address name"
            v-model.trim="site.siteName"
            :rules="[ fieldIsRequired('Site name'), checkDupSiteName ]"
            class="required_field"
            browser-autocomplete="no"
            :readonly="!!address.siteName"></v-text-field> 
        </v-flex>
        <v-flex md5>
          <v-text-field
            label="Full name"
            v-model.trim="site.fullName"
            :rules="[ fieldIsRequired('Full name'), fieldCharLimit('Full name', 35) ]"
            class="required_field"></v-text-field> 
        </v-flex>
      </v-layout>
      <v-text-field
        label="Address line 1"
        id="Address"
        v-model.trim="site.address1"
        :rules="[fieldIsRequired('Address'), fieldCharLimit('Address1', 50)]"
        class="required_field"></v-text-field>
      <v-text-field
        label="Address line 2"
        id="Address2"
        v-model.trim="site.address2"
        ></v-text-field>
      <v-layout justify-space-between>
        <v-flex md3>
          <v-text-field
            label="City"
            id="City"
            v-model.trim="site.city"
            :rules="[fieldIsRequired('City')]"
            class="required_field"
            ></v-text-field>
        </v-flex>
        <v-flex md3>
          <vite-autocomplete
            :items="$store.getters.stateAbbrevs"
            v-model.trim="site.state"
            label="State"
            :disabled="(editMode && !siteKeyCanEdit) || site.countryCode !== 'US'"
            id="addressState"></vite-autocomplete>
        </v-flex>
        <v-flex md3>
          <v-text-field
            label="Zip code"
            id="Zip code"
            v-model.trim="site.zipCode"
            :disabled="editMode && !siteKeyCanEdit"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex md3>
          <v-text-field
            label="Phone"
            v-model.trim="site.phone"
            ></v-text-field>
        </v-flex>
        <v-flex md3>
          <v-text-field
            label="Company name"
            v-model.trim="site.company"
            ></v-text-field>
        </v-flex>
        <v-flex md3>
          <v-btn flat color="primary" @click.stop="goToGoogleMapLink"><v-icon>location_on</v-icon> Google Map</v-btn>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex md3>
          <v-text-field
            label="EIN"
            v-model.trim="site.partyId"></v-text-field>
        </v-flex>
        <v-flex md3>
          <v-text-field
            label="Email"
            v-model.trim="site.email"></v-text-field>
        </v-flex>
        <v-flex md3>
          <vite-autocomplete
            hide-details
            :items="countryCodeArray"
            item-text="name"
            item-value="value"
            v-model="site.countryCode"
            label="Country"></vite-autocomplete>
        </v-flex>
      </v-layout>
    </template>
  </FormSubmitPopup>
</template>

<script>
import EditAddress from './EditAddress'
import {gotoGoogleMap} from '@/utils/tools'

export default {
  name: 'LabelCreateAddress',
  extends: EditAddress,
  data () {
    return {
      site: {
        siteName: '',
        fullName: '',
        address1: '',
        address2: '',
        state: '',
        city: '',
        zipCode: '',
        phone: '',
        company: '',
        partyId: '',
        email: '',
        countryCode: 'US'
      },
      siteKeyCanEdit: false
    }
  },
  computed: {
    countryCodeArray () {
      return this.$store.getters.countryCodeArray
    }
  },
  watch: {
    countryCode (value) {
      if (value === 'US') {
        this.site.state = ''
      }
    }
  },
  methods: {
    onSubmitted () {
      this.actionFunc({...this.site})
    },
    goToGoogleMapLink () {
      gotoGoogleMap(this.addressInEdit)
    }
  }
}
</script>

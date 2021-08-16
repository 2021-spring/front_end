<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Confirm"
    hasAlert
    ref="formPopup"
    large>
    <template v-slot:input>
      <v-container fluid>
        <v-layout row>
          <v-flex>
            <v-card width="100%">
              <v-card-text>
                <v-layout align-baseline justify-space-between wrap>
                  <v-flex class="title" md2>Template Info: </v-flex>
                  <v-flex md2 xs5>
                    <v-text-field
                      hide-details
                      label="Template name"
                      v-model="name"
                      :rules="[fieldIsRequired('template')]"
                      class="required_field"></v-text-field> 
                  </v-flex>
                  <v-flex md2 xs5>
                    <v-text-field
                      hide-details
                      label="Sender name"
                      v-model="from.fullName"
                      :rules="[fieldCharLimit('Sender name', 35)]"></v-text-field> 
                  </v-flex>
                  <v-flex md2 xs5>
                    <v-text-field
                      hide-details
                      label="Company name"
                      v-model="from.company"></v-text-field> 
                  </v-flex>
                  <v-flex md2 xs5>
                    <v-text-field
                      hide-details
                      label="Sku"
                      v-model="sku"></v-text-field> 
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
        <v-layout row>
          <v-flex>
            <v-card width="100%" height="100%">
              <v-card-text>
                <v-layout class="title">
                  Label details:
                </v-layout>
                <v-layout justify-space-between align-baseline wrap>
                  <v-flex md2 xs5>
                    <v-select
                      hide-details
                      :items="shippingServices"
                      item-text="text"
                      :menu-props="{returnValue:'value'}"
                      v-model="shippingService"
                      :rules="[fieldIsRequired('service')]"
                      label="Shipping service"
                    ></v-select>
                  </v-flex>
                  <v-flex md2 >
                    <v-text-field
                      persistent-hint
                      v-model.number="weightLb"
                      :rules="[
                        fieldIsRequired('weight'), 
                        fieldIsOverZero('weight'),
                        isMeasurementMetric ? (() => true) : fieldIsPkgWeight(isOz)
                      ]"
                      :label="isMeasurementMetric ? 
                        'Weight(kg)' :
                        `Weight(${isOz ? 'Click Oz switch to Lbs' : 'Click Lbs switch to Oz'})`"
                    >
                      <template v-slot:append>
                        <span v-if="!isMeasurementMetric" @click="isOz = !isOz" style="cursor: pointer">{{ isOz ? 'Oz' : 'Lbs' }}</span>
                      </template>
                    </v-text-field>
                  </v-flex>
                  <v-flex md2 xs5>
                    <v-text-field
                      hide-details
                      label="Declared value"
                      :disabled="!enableInsured"
                      v-model.number="insuredValue"
                      :rules="[fieldIsRequired('value'), fieldIsNoLessThanZero('value')]">
                    </v-text-field>
                  </v-flex>
                  <v-flex md4></v-flex>
                </v-layout>
                <v-layout justify-space-between align-baseline wrap>
                  <v-flex md2 xs5>
                    <v-select
                      hide-details
                      :items="packagings"
                      item-text="name"
                      item-value="pkgValue"
                      label="Packaging"
                      v-model="packaging"
                      :rules="[fieldIsRequired('Packaging')]"></v-select>
                  </v-flex>
                  <v-flex md2 xs5>
                    <v-select
                      label="Signature service"
                      :items="signatureOptions"
                      item-text="text"
                      :menu-props="{returnValue:'value'}"
                      v-model="signature"
                    />
                  </v-flex>
                  <v-flex md2 xs5>
                    <v-autocomplete
                      label="Service type"
                      v-model="isExpedited"
                      item-text="label"
                      item-value="value"
                      :items="[
                        {label: 'Normal', value: false}, 
                        {label: 'Expedite', value: true}
                      ]"></v-autocomplete>
                  </v-flex>
                  <v-flex md4 xs5>
                    <SelectWidget
                      label="Other Services"
                      :items="otherServices"
                      v-model="selectedOtherServices"
                      itemText='displayName'
                      itemValue='value'
                      chipText='displayName'
                      :displayQty="3"/>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between wrap>
                  <v-flex>
                    <v-text-field
                      label="Memo"
                      :hint="`Memo will be printed on label. System data: ${flexibleVars.join(', ')}`"
                      :rules="[fieldCharLimit('Memo', 40)]"
                      v-model="memo"
                      counter="40"></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout>       
                  <v-flex md3>
                    <v-autocomplete
                      style="margin-bottom: 0;"
                      label="Instruction template"
                      @input="changeInstruction"
                      :items="instructions"
                      item-text="name"
                      return-object
                      clearable></v-autocomplete>
                  </v-flex>     
                </v-layout>
                <v-layout>
                  <v-textarea
                    label="Instruction"
                    outline
                    v-model="instructionContent"
                    rows="8"
                    class="thinBox"></v-textarea>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { timeTools, checkRules, cloneDeep, measurementTools } from '@/utils/tools'
import SelectWidget from './SelectWidget'

export default {
  name: 'LabelTemplatePopup',
  components: {
    FormSubmitPopup,
    SelectWidget
  },
  mixins: [
    checkRules,
    timeTools,
    measurementTools
  ],
  data () {
    return {
      title: 'Create template',
      packaging: '',
      signature: false,
      newSenderName: '',
      from: {},
      insuredValue: 0,
      shippingService: 'USPS',
      weightLb: 0,
      isSaveFrom: false,
      addressInEdit: {},
      memo: '#{orderId}',
      name: '',
      sku: '',
      isExpedited: false,
      selectedOtherServices: [],
      instruction: {},
      instructionContent: '',
      isOz: false
    }
  },
  watch: {
    signatureOptions (value) {
      let defaultValue = value[0].value || ''
      for (let option of value) {
        if (option.default) defaultValue = option.value
        if (option.value === this.signature) return
      }
      this.signature = defaultValue
    }
  },
  computed: {
    flexibleVars () {
      return this.$store.getters.labelTemplateFlexibleVars.map(item => `#{${item}}`)
    },
    packagings () {
      return this.$store.getters.tenantPackagingsWithDefault
    },
    otherServices () {
      return this.$store.getters.otherServices
    },
    instructions () {
      return this.$store.getters.tenant.instructions || []
    },
    labelServices () {
      return this.$store.getters.labelServices
    },
    shippingServices () {
      return this.labelServices
        .reduce((services, {carrier = '', enableInsured = false, serviceTypes = []}, idx) => [
          ...services, 
          ...serviceTypes,
          { divider: true }
        ], [])
    },
    enableInsured () {
      return (this.labelServices.find(service => service.carrier === this.carrier) || {}).enableInsured
    },
    carrier () {
      return (this.labelServices.find(service => 
        service.serviceTypes.find(serviceType => 
          this.shippingService === serviceType.value || 
          this.serviceType === service.carrier
        )
      ) || {}).carrier
    },
    signatureOptions () {
      const optMap = new Map(this.labelServices.map(service => [service.carrier, service.signatureOptions]))
      return optMap.get(this.carrier)
    },
    isMeasurementMetric () {
      return !!this.$store.getters.isMeasurementMetric
    }
  },
  mounted () {
    if (this.initTemplate) {
      const {isMeasurementMetric, weightLb = 0, ...rest} = this.initTemplate
      Object.assign(this, cloneDeep(rest), {
        weightLb: this.convertWeight(weightLb, isMeasurementMetric)
      })
      this.instructionContent = this.initTemplate.instruction || ''
    }
  },
  methods: {
    extractPayload () {
      let {
        signature, 
        weightLb,
        packaging, 
        from,
        shippingService,
        memo,
        name,
        sku,
        isExpedited,
        selectedOtherServices,
        instructionContent,
        insuredValue
      } = this
      return {
        signature, 
        weightLb: this.isOz ? (weightLb / 16) : weightLb,
        isMeasurementMetric: this.isMeasurementMetric,
        packaging, 
        from,
        shippingService,
        memo,
        name: name.trim(),
        sku,
        isExpedited,
        selectedOtherServices,
        instruction: instructionContent,
        insuredValue: this.enableInsured ? insuredValue : 0,
        key: this.initTemplate.key || ''
      }
    },
    onSubmitted () {
      const payload = this.extractPayload()
      return this.$store.dispatch(JSON.stringify(this.initTemplate) === '{}' ? 'updateTemplate' : 'updateTemplate', payload)
        .then(() => {
          this.$emit('submitted', payload)
        })
    },
    changeInstruction (e) {
      this.instructionContent = e.content
    }
  },
  props: {
    value: Boolean,
    initTemplate: Object
  }
}
</script> 

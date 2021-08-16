<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">
          {{ tabItem }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
          <v-container fluid grid-list-lg v-if="index === 0" >
            <v-flex md4>
              <v-btn dark color="primary" @click.stop="showDestinationAddDialog">Add destination</v-btn>
            </v-flex>
            <v-card>
              <v-list>
                <v-list-group
                  v-for="item in destinations"
                  v-model="item.active"
                  :key="item.title"
                  prepend-icon="local_offer"
                  no-action
                >
                  <template v-slot:activator>
                    <v-list-tile>
                      <v-list-tile-content>
                        <v-list-tile-title><v-icon>mdi-anchor</v-icon>{{ item.name }}</v-list-tile-title>
                      </v-list-tile-content>
                    </v-list-tile>
                  </template>
                  <v-list-tile style="background-color: rgb(230, 230, 230)">
                    <v-list-tile-content>
                      <v-list-tile-title>{{ item.content }}</v-list-tile-title>
                    </v-list-tile-content>
                    <v-list-tile-action>
                      <v-layout>
                        <v-flex>
                          <v-btn fab small flat @click.stop="showDestinationEditDialog(item)"><v-icon>edit</v-icon></v-btn>
                        </v-flex>
                        <v-flex>
                          <v-btn fab small flat @click.stop="deleteDestination(item)"><v-icon>delete</v-icon></v-btn>
                        </v-flex>
                      </v-layout>
                    </v-list-tile-action>
                  </v-list-tile>
                </v-list-group>
              </v-list>
            </v-card>
            <DestinationEdit
              title="Add destination"
              v-model="destinationAddDialog"
              v-if="destinationAddDialog"
              :actionFunc="addDestination"
              actionText="Add"
              :destination="destinationInEdit"/>
            <DestinationEdit
              title="Edit destination"
              v-model="destinationEditDialog"
              v-if="destinationEditDialog"
              :actionFunc="editDestination"
              :destination="destinationInEdit"/>
          </v-container>
          <v-container fluid grid-list-lg v-if="index === 1" >
            <v-flex md4>
              <v-btn dark color="primary" @click.stop="showInstructionAddDialog">Add Instructions</v-btn>
            </v-flex>
            <v-card>
              <v-list>
                <v-list-group
                  v-for="item in instructions"
                  v-model="item.active"
                  :key="item.title"
                  prepend-icon="local_offer"
                  no-action
                >
                  <template v-slot:activator>
                    <v-list-tile>
                      <v-list-tile-content>
                        <v-list-tile-title><v-icon>mdi-anchor</v-icon>{{ item.name }}</v-list-tile-title>
                      </v-list-tile-content>
                    </v-list-tile>
                  </template>

                  <v-list-tile style="background-color: rgb(230, 230, 230)">
                    <v-list-tile-content>
                      <v-list-tile-title>{{ item.content }}</v-list-tile-title>
                    </v-list-tile-content>
                    <v-list-tile-action>
                      <v-layout>
                        <v-flex>
                          <v-btn fab small flat @click.stop="showInstructionEditDialog(item)"><v-icon>edit</v-icon></v-btn>
                        </v-flex>
                        <v-flex>
                          <v-btn fab small flat @click.stop="deleteInstruction(item)"><v-icon>delete</v-icon></v-btn>
                        </v-flex>
                      </v-layout>
                    </v-list-tile-action>
                  </v-list-tile>
                </v-list-group>
              </v-list>
            </v-card>
            <DestinationEdit
              title="Add Instruction"
              v-model="instructionAddDialog"
              v-if="instructionAddDialog"
              :actionFunc="addInstruction"
              actionText="Add"
              :destination="instructionInEdit"/>
            <DestinationEdit
              title="Edit Instruction"
              v-model="instructionEditDialog"
              v-if="instructionEditDialog"
              :actionFunc="editInstruction"
              :destination="instructionInEdit"/>
          </v-container>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
  </v-container>
</template>

<script>
import DestinationEdit from './DestinationEdit'

export default {
  name: 'Shipping',
  components: {
    DestinationEdit
  },
  data () {
    return {
      tab: null,
      tabs: ['Destinations', 'Instructions'],
      destinationAddDialog: false,
      destinationEditDialog: false,
      instructionAddDialog: false,
      instructionEditDialog: false,
      destinationInEdit: {},
      instructionInEdit: {}
    }
  },
  computed: {
    destinations () {
      return this.$store.getters.tenant.destinations || []
    },
    instructions () {
      return this.$store.getters.tenant.instructions || []
    }
  },
  methods: {
    showDestinationEditDialog (item) {
      this.destinationEditDialog = true
      this.destinationInEdit = {...item}
    },
    showDestinationAddDialog () {
      this.destinationAddDialog = true
      this.destinationInEdit = {}
    },
    showInstructionEditDialog (item) {
      this.instructionEditDialog = true
      this.instructionInEdit = {...item}
    },
    showInstructionAddDialog () {
      this.instructionAddDialog = true
      this.instructionInEdit = {}
    },
    addDestination (destination) {
      this.$store.dispatch('addDestination', destination)
    },
    editDestination (destination) {
      this.$store.dispatch('editDestination', destination)
    },
    addInstruction (instruction) {
      this.$store.dispatch('addInstruction', instruction)
    },
    editInstruction (instruction) {
      this.$store.dispatch('editInstruction', instruction)
    },
    deleteDestination (destination) {
      if (confirm('Are you sure to delete?')) {
        this.$store.dispatch('deleteDestination', destination)
      }
    },
    deleteInstruction (instruction) {
      if (confirm('Are you sure to delete?')) {
        this.$store.dispatch('deleteInstruction', instruction)
      }
    }
  }
}
</script>

<template >
  <v-toolbar-items> 
    <v-btn class="announcement-toggle" flat dark
      @click.stop="showAnnouncements">
      <v-badge :value="unreadCount"  color="red">
        <template v-slot:badge>
          <div dark>{{unreadCount}}</div>
        </template>
        <v-icon dark>notifications</v-icon>
      </v-badge>
    </v-btn>
    <v-dialog 
      v-model="dialog"
      width="800"
      scrollable
      persistent
      @keydown.esc="closeAnnouncements"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title class="mx-auto">Notifications</v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          <v-container fluid style="min-height: 100px;" grid-list-lg>
            <v-tabs
              v-if="(allAnnouncementKeys.length + notifications.length) && dialog"
              color="transparent"
              v-model="tab"
              show-arrows
              primary
              >
              <v-tab
                v-for="announcementKey of announcementsMapKey"
                :key="announcementKey"
                class="announcement-tab"
                ripple
              >
                <v-badge :value="getUnreadCountByKey(announcementKey)"
                  small
                  color="red">
                  <template v-slot:badge>
                    <div dark></div>
                  </template>
                  {{announcementKey !== 'general' ? announcementsMap.get(announcementKey)[0].broadcasterName : 'General'}}
                </v-badge>      
              </v-tab>
              <v-tab-item
                v-for="announcementKey in announcementsMapKey"
                :key="announcementKey"
              >
                <v-layout row wrap v-if="announcementKey === 'general'">
                  <v-flex xs12 v-for="notification in notifications" :key="notification.key">
                    <v-card hover raised @click="clickNotification(notification)">
                      <v-card-text >
                        <div class="cardTitle">You have {{notification.displayName}}</div>
                        <div class="cardText"><a class="underline">Click to go to {{notification.pathName}} page</a></div>
                      </v-card-text>
                    </v-card>
                  </v-flex>
                </v-layout>
                <v-layout row wrap v-else>
                  <v-flex xs12 v-for="(announcement, index) in announcementsMap.get(announcementKey)" :key="'announcement' + index">
                    <v-card hover raised>
                      <v-card-text>
                        <div class="cardTitle">{{ announcement.broadcasterName + '  ' + toDateString(announcement.startDate) }}</div>
                        <div class="cardText">{{ announcement.msgContent }}</div>
                      </v-card-text>
                    </v-card>
                  </v-flex>
                </v-layout>
              </v-tab-item>
            </v-tabs>
            <v-flex 
              v-else
              text-md-center
              md12>
              There is no notification now
            </v-flex>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-btn color="primary" flat @click="closeAnnouncements">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-toolbar-items>
</template>

<script>
import { timeTools } from '../utils/tools'

export default {
  name: 'AnnouncementWidget',
  mixins: [timeTools],
  data () {
    return {
      dialog: false,
      tab: null,
      readingKeys: new Set()
    }
  },
  watch: {
    tab () {
      if (this.dialog) this.setUnReadTabKeysToReadList()
    },
    dialog (toggle) {
      if (!toggle) {
        this.$store.dispatch('updateUserExtraReadList', this.getTotalReadList())
          .then(() => {
            this.readingKeys.clear()
          })
      } else {
        if (this.unReadTabKeys.length > 0) this.setUnReadTabKeysToReadList()
      }
    }  
  },
  computed: {
    announcementsMap () {
      return this.$store.getters.announcementsMap || new Map()
    },
    announcementsMapKey () {
      let keys = []
      let sysInfoSign = false
      this.announcementsMap.forEach((announcements, key) => {
        if (key === 'sys' && announcements.length) {
          sysInfoSign = true
          return
        }
        if (announcements.length)keys.push(key)
      })
      if (sysInfoSign) keys = ['sys', ...keys]
      if (this.notifications.length) keys = ['general', ...keys]
      return keys
    },
    unReadTabKeys () {
      if (this.tab === 0 && this.announcementsMapKey.length && this.announcementsMapKey[0] === 'general') return []
      let broadcasterKey = this.announcementsMapKey[this.tab]
      let currentTabAnnouncements = this.announcementsMap.get(broadcasterKey) || []
      return currentTabAnnouncements.filter(({_key}) => !this.announcementsReadList.includes(_key)).map(({_key}) => _key)
    },
    announcementsReadList () {
      return (this.$store.getters.userExtra || {}).announcementsReadList || []
    },
    unreadCount () {
      return this.allUnreadAnnouncements.length + this.notifications.length
    },
    allAnnouncementKeys () {
      return [...this.announcementsMap].reduce((keys, [key, announcements]) => [...keys, ...announcements.map(({_key}) => _key)], [])
    },
    allUnreadAnnouncements () {
      return this.allAnnouncementKeys.filter(key => !(this.announcementsReadList.includes(key) || this.readingKeys.has(key)))
    },
    notifications () {
      return this.$store.getters.notifications 
    }
  },
  methods: {
    closeAnnouncements () {
      this.dialog = false 
    },
    showAnnouncements () {
      this.tab = null
      this.dialog = true
    },
    getUnreadCountByKey (key) {
      if (key === 'general') {
        return this.notifications.length
      }
      return this.announcementsMap.get(key)
        .filter(({_key}) => this.allUnreadAnnouncements.includes(_key))
        .length || 0
    },
    setUnReadTabKeysToReadList () {
      this.unReadTabKeys.forEach(key => {
        this.readingKeys.add(key)
      })
    },
    getTotalReadList () {
      return [...(new Set([
        ...(this.announcementsReadList.filter(key => this.allAnnouncementKeys.includes(key))), 
        ...this.readingKeys
      ]))]
    },
    clickNotification (notification) {
      this.dialog = false 
      this.$router.push({path: notification.path})
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
  width: 100%;
}
.announcement-tab .v-badge__badge{
  width: 8px;
  height: 8px;
  top: -6px;
  right: -10px;
}
</style>

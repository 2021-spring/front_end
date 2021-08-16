<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem.value" :href="`#${tabItem.value}`">
          <v-badge class="notification" :value="showBadge(tabItem.value)" color="red">
            <template v-slot:badge>
              <div dark></div>
            </template>
            <span class="tabItem">
               {{ tabItem.displayName }}
            </span>
          </v-badge>
        </v-tab>
    </v-tabs>
    <v-tabs-items v-model="tab" touchless>
      <v-tab-item value="byTracking">
        <v-layout align-baseline>
          <v-flex xs12 md3>
            <v-layout align-baseline>
              <v-text-field
                  name="input-1"
                  label="Tracking"
                  id="search"
                  title="Enter to search"
                  :value="barcode"
                  @input="e => barcode = normalizeInputString(e)"
                  @keyup.enter="searchNow"
                  autofocus
                  :disabled="isUpdateOrgId"
              ></v-text-field>
              <v-btn 
                  small
                  color="primary" 
                  @click="searchNow"
                  :disabled="loading || isUpdateOrgId"
              >Search
              </v-btn>
            </v-layout>
          </v-flex>
        </v-layout>
        <v-layout align-baseline justify-end v-if="isWarehouse" class="wms-mt-3">
          <v-flex md2 class="ml-2" v-if="isWarehouse"><v-btn small color="primary" @click="() => showChangeLogDialog = true">Change log</v-btn></v-flex>
          <v-flex md1 v-if="isUpdateOrgId" class="mr-2"><v-btn small color="primary" @click="cancelChanges" :disabled="loading">Cancel</v-btn></v-flex>
          <v-flex md2 class="ml-2">
            <v-btn 
              small 
              color="primary" 
              v-if="hasAuthToFunctionality('updatePkgsInfo')"
              :disabled="updateButtonDisabled || loading || (isUpdateOrgId && JSON.stringify(changes) === '{}')" 
              @click="updateButtonFunc"
            >
              {{updateOrgIdText}}
            </v-btn>
          </v-flex>
          <v-flex md2>
            <v-text-field
                append-icon="filter_list"
                label="Filter"
                single-lineF
                hide-details
                v-model="filter"
              ></v-text-field>
          </v-flex>
        </v-layout>
        <v-data-table
          :headers="headerFunc()"
          :items="tempPackges"
          :pagination.sync="pagination"
          :rows-per-page-items="rowPerPage"
          class="elevation-1"
          :search="filter"
          :loading="loading"
        >
          <template v-slot:progress>
            <v-progress-linear color="blue" indeterminate></v-progress-linear>
          </template>
          <template v-slot:items="props">
            <td class="text-xs-left">
              <v-layout
                @click="!isWarehouse && editOrgNote(props.item)"
                :style="!isWarehouse && 'cursor: pointer;'"
                nowrap>
                <span
                >
                  {{getTrackingText(props.item.trackings)}}
                </span>
                <v-icon
                  v-if="!isWarehouse && props.item.orgNote"
                  color="info"
                  small
                >info</v-icon>
              </v-layout>
            </td>
            <td class="text-xs-left">
              <div>
                <template v-if="isUpdateOrgId && !props.item.isConfirmed && !packages[props.item.key].organizationKey">
                  <v-text-field
                    name="upcField"
                    id="upcField"
                    v-model="props.item.upc"
                    color="primary"
                    @keyup="upcOrQtyChanged($event, 'upc', props.item)"
                    :class="getUpcStyle(props.item)"
                  ></v-text-field>
                </template>
                <template v-else>
                  <v-layout>{{ props.item.upc }}{{props.item.sku && (' / ' + props.item.sku) }}</v-layout>
                </template>
                <div @click="showSnEditDialog(props.item)" v-if="isEnableSnScan && isUpdateOrgId">
                  <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
                </div>
                <div v-else>
                  <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
                </div>
              </div>
            </td>
            <td class="text-xs-left" style="min-width: 10em">{{ getProductName(props.item) }}</td>
            <td class="text-xs-left">
              <template v-if="isUpdateOrgId && !props.item.isConfirmed && !props.item.isAbnormal">
                <v-text-field
                  v-model.number="props.item.quantity"
                  mask="#######"
                  color="primary"
                  @keyup="upcOrQtyChanged($event, 'quantity', props.item)"
                  :class="getQtyStyle(props.item)"
                ></v-text-field>
              </template>
              <template v-else>
                {{ props.item.quantity }}
              </template>
            </td>
            <td class="text-xs-left" v-if="isWarehouse">
              <template v-if="isUpdateOrgId && !props.item.isConfirmed && !props.item.isAbnormal">
                <v-flex md12 lg7>
                  <v-autocomplete
                    :items="organizations"
                    item-text="organizationId"
                    item-value="key"
                    v-model="props.item.organizationKey"
                    clearable
                    @keyup.esc="resetOneOrgId(props.item)"
                    @change="organizationChanged($event, props.item)">
                      <template v-slot:selection="data">
                        <div :style="getUpdateStyle(props.item)">{{data.item.organizationId}}</div>
                      </template>
                  </v-autocomplete>
                </v-flex>
              </template>
              <template v-else>
                {{ props.item.orgId }}
              </template>
            </td>
            <td class="text-xs-left">
              <v-layout>
                {{ props.item.siteName || (getWarehouseName(props.item.warehouseSite)) || '' }}
              </v-layout>
              <v-layout v-if="isWarehouse && props.item.workerName">
                Operator: {{ props.item.workerName }}
              </v-layout>
            </td>
            <td class="text-xs-left">
              <template v-if="props.item.isConfirmed">
                <v-tooltip top>
                  <template v-slot:activator="data">
                    <v-icon v-on="data.on">check_circle</v-icon>
                  </template>
                  <span>{{props.item.confirmedTime}}</span>
                </v-tooltip>
              </template>
            </td>
            <td class="text-xs-left">
              <template v-if="!!props.item.isAddedToInventory">
                <v-icon>check_circle</v-icon>
              </template>
              <template v-else-if="!props.item.isAbnormal && !isWarehouse">
                <v-btn fab dark color="blue" 
                  @click="editProduct(props.item.upc || '')"
                  title="Add product" class="link-button"
                >
                  <v-icon dark size="20">add</v-icon>
                </v-btn>
              </template>
            </td>
            <td class="text-xs-left">{{ props.item.createTime ? toTimestampString(props.item.createTime) : ''}}</td>
            <td class="text-xs-center">
              <v-layout justify-end>
                <PackageNoteIconWidget
                  v-model="props.item"
                  @click="showNoteAndComments"
                />
                <v-btn 
                  v-if="!props.item.warehouseSite && !props.item.isConfirmed"
                  flat 
                  icon
                  color="primary" 
                  @click="removePackage(props.item)"
                ><v-icon>delete</v-icon></v-btn>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-tab-item>
      <v-tab-item value="byUpcAndDate">
        <PaginationController
          v-model="packagesByDate"
          getDataActionName="searchPackagesPagination"
          isUsingModelInAction
          :historyLimit="historyLimit"
          :haveSearchBox="true"
          searchBoxLabel="UPC / SKU / SN"
          searchBoxHint="Add * to search for sku / Add % to search for keywords"
          :select="isWarehouse ? selectedOrganization : undefined"
          :isRefreshSelect="false"
          :haveStartDate="true"
          :refresh="refreshTable"
          keepKeywordCase
          >
          <template v-slot:dataTable="{ isLoadedToEnd }">
            <v-data-table
              :headers="headerFunc(isLoadedToEnd)"
              :items="packagesByDate"
              :total-items="10"
              class="elevation-1"
              :search="filter"
              hide-actions>
              <template v-slot:items="props">
                <td class="text-xs-left">
                  <v-tooltip v-if="!isWarehouse && props.item.orgNote" top>
                    <template v-slot:activator="{ on }">
                      <v-layout v-on="on" nowrap>
                        <span>
                          {{getTrackingText(props.item.trackings)}}
                        </span>
                        <v-icon
                          v-if="!isWarehouse && props.item.orgNote"
                          color="info"
                          small
                        >info</v-icon>
                      </v-layout>
                    </template>
                    <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{props.item.orgNote}}</div>
                  </v-tooltip>
                  <span v-else>{{getTrackingText(props.item.trackings)}}</span>
                </td>
                <td class="text-xs-left">
                  <v-layout>{{ props.item.upc }}{{props.item.sku && (' / ' + props.item.sku) }}</v-layout>
                  <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
                </td>
                <td class="text-xs-left" style="min-width: 10em">{{ getProductName(props.item) }}</td>
                <td class="text-xs-left">{{ props.item.quantity }}</td>
                <td class="text-xs-left" v-if="isWarehouse">{{ getDisplayOrgId(props.item.organizationKey) }}</td>
                <td class="text-xs-left">
                  <v-layout>
                    {{ props.item.siteName || (getWarehouseName(props.item.warehouseSite)) || '' }}
                  </v-layout>
                  <v-layout v-if="isWarehouse && props.item.workerName">
                    Operator: {{ props.item.workerName }}
                  </v-layout>  
                </td>
                <td class="text-xs-left">
                  <template v-if="props.item.isConfirmed">
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <v-icon v-on="on">check_circle</v-icon>
                      </template>
                      <span>{{props.item.confirmedTime}}</span>
                    </v-tooltip>
                  </template>
                </td>
                <td class="text-xs-left">
                  <template v-if="!!props.item.isAddedToInventory">
                    <v-icon>check_circle</v-icon>
                  </template>
                  <template v-else-if="!props.item.isAbnormal && !isWarehouse">
                    <v-btn fab dark color="blue" 
                      @click="editProduct(props.item.upc || '')"
                      title="Add product" class="link-button"
                    >
                      <v-icon dark size="20">add</v-icon>
                    </v-btn>
                  </template>
                </td>
                <td class="text-xs-left">{{ props.item.createTime ? toTimestampString(props.item.createTime) : ''}}</td>
                <td class="text-xs-center">
                  <v-layout>
                    <PackageNoteIconWidget
                      v-model="props.item"
                      @click="showNoteAndComments"
                    />
                    <v-btn 
                      v-if="!props.item.warehouseSite && !props.item.isConfirmed"
                      flat
                      icon
                      color="primary" 
                      @click="removePackage(props.item)"
                    ><v-icon>delete</v-icon></v-btn>
                  </v-layout>
                </td>
              </template>
            </v-data-table>
          </template>
          <template v-if="isWarehouse" v-slot:beforeSearchBox>
            <v-flex md4>
              <v-autocomplete
                v-model="selectedOrganization"
                :items="organizationSelect"
                label="Select organization"
                item-text="displayName"
                item-value="key"></v-autocomplete>
            </v-flex>
          </template>
        </PaginationController>
      </v-tab-item>
      <v-tab-item value="unlinkedPackages">
        <PaginationController
          v-model="packagesUnlinked"
          getDataActionName="searchPackagesPagination"
          isUsingModelInAction
          :actionPredicates="[{ field: 'isAddedToInventory', compare: '==', value: false }]"
          :historyLimit="historyLimit"
          :select="selectedOrganization"
          :isRefreshSelect="false"
          :haveStartDate="true"
          :refresh="refreshTable">
          <template v-slot:dataTable="{ isLoadedToEnd }">
            <v-data-table
              :headers="headerFunc(isLoadedToEnd)"
              :items="packagesUnlinked"
              class="elevation-1"
              :search="filter"
              hide-actions>
              <template v-slot:items="props">
                <td class="text-xs-left">
                 <v-tooltip v-if="!isWarehouse && props.item.orgNote" top>
                    <template v-slot:activator="{ on }">
                      <v-layout v-on="on" nowrap>
                        <span>
                          {{getTrackingText(props.item.trackings)}}
                        </span>
                        <v-icon
                          v-if="!isWarehouse && props.item.orgNote"
                          color="info"
                          small
                        >info</v-icon>
                      </v-layout>
                    </template>
                    <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{props.item.orgNote}}</div>
                  </v-tooltip>
                  <span v-else>{{getTrackingText(props.item.trackings)}}</span>
                </td>
                <td class="text-xs-left">
                  <v-layout>{{ props.item.upc }}{{props.item.sku && (' / ' + props.item.sku) }}</v-layout>
                  <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
                </td>
                <td class="text-xs-left" style="min-width: 10em">{{ getProductName(props.item) }}</td>
                <td class="text-xs-left">{{ props.item.quantity }}</td>
                <td class="text-xs-left" v-if="isWarehouse">{{ getDisplayOrgId(props.item.organizationKey) }}</td>
                <td class="text-xs-left">
                  <v-layout>
                    {{ props.item.siteName || (getWarehouseName(props.item.warehouseSite)) || '' }}
                  </v-layout>
                  <v-layout v-if="isWarehouse && props.item.workerName">
                    Operator: {{ props.item.workerName }}
                  </v-layout>  
                </td>
                <td class="text-xs-left">
                  <template v-if="props.item.isConfirmed">
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <v-icon v-on="on">check_circle</v-icon>
                      </template>
                      <span>{{props.item.confirmedTime}}</span>
                    </v-tooltip>
                  </template>
                </td>
                <td class="text-xs-left">
                  <template v-if="!!props.item.isAddedToInventory">
                    <v-icon>check_circle</v-icon>
                  </template>
                  <template v-else-if="!props.item.isAbnormal && !isWarehouse">
                    <v-btn fab dark color="blue" 
                      @click="editProduct(props.item.upc || '')"
                      title="Add product" class="link-button"
                    >
                      <v-icon dark size="20">add</v-icon>
                    </v-btn>
                  </template>
                </td>
                <td class="text-xs-left">{{ props.item.createTime ? toTimestampString(props.item.createTime) : ''}}</td>
                <td class="text-xs-center">
                  <v-layout align-center justify-end>
                    <PackageNoteIconWidget
                      v-model="props.item"
                      @click="showNoteAndComments"
                    />
                    <LoaderButton
                      :buttonIcon="`delete`"
                      :disabled="props.item.isAbnormal"
                      :flat="true"
                      v-if="isWarehouse || (!isWarehouse && !props.item.warehouseSite)"
                      :promiseAwait="deletePackage"
                      :promiseItem="props.item"/>
                  </v-layout>
                </td>
              </template>
            </v-data-table>
          </template>
          <template v-if="isWarehouse" v-slot:beforeMenu>
            <v-flex md4>
              <v-autocomplete
                v-model="selectedOrganization"
                :items="organizationSelect"
                label="Select organization"
                item-text="displayName"
                item-value="key"
              ></v-autocomplete>
            </v-flex>
          </template>
        </PaginationController>
      </v-tab-item>
      <v-tab-item value="abnormalPackages">
        <v-layout justify-space-between align-baseline>
          <v-flex md2 class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
          <v-flex md3>
            <v-text-field
              append-icon="filter_list"
              label="Search"
              single-line
              hide-details
              clearable
              v-model="filter"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-data-table
          :headers="abnormalPackagesHeader"
          :items="abnormalPackages"
          :pagination.sync="pagination"
          :rows-per-page-items="rowPerPage"
          class="elevation-1"
          :search="filter"
          :loading="loading"
        >
          <template v-slot:progress>
            <v-progress-linear color="blue" indeterminate></v-progress-linear>
          </template>
          <template v-slot:items="props">
            <td class="text-xs-left">
              <v-tooltip v-if="!isWarehouse && props.item.orgNote" top>
                <template v-slot:activator="{ on }">
                  <v-layout v-on="on" nowrap>
                    <span>
                      {{getTrackingText(props.item.trackings)}}
                    </span>
                    <v-icon
                      v-if="!isWarehouse && props.item.orgNote"
                      color="info"
                      small
                    >info</v-icon>
                  </v-layout>
                </template>
                <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{props.item.orgNote}}</div>
              </v-tooltip>
              <span v-else>{{getTrackingText(props.item.trackings)}}</span>
            </td>
            <td class="text-xs-left">
              <v-layout>{{ props.item.upc }}{{props.item.sku && (' / ' + props.item.sku) }}</v-layout>
              <v-layout style="max-width: 300px; overflow-wrap: break-word; word-break: normal;" wrap v-if="props.item.snArray && props.item.snArray.length">{{ props.item.snArray && props.item.snArray.length && (`(${props.item.snArray.join(', ')})`) }}</v-layout>
            </td>
            <td class="text-xs-left">
              <v-layout row wrap>
                <v-flex xs12> {{ getProductName(props.item) }}</v-flex>
                <v-flex xs12>
                  <div class="cardTitle">Note: </div>
                  <div class="cardText">{{showFlagText(props)}}</div>
                </v-flex>
              </v-layout>
            </td>
            <td class="text-xs-left">
              <v-tooltip top>
                <template v-slot:activator="{ on }">
                  <span v-on="on">
                    {{ props.item.quantity }} ({{ props.item.normalQty }}+{{ props.item.abnormalQty || 0 }})
                  </span>
                </template>
                <span>Normal quantity: {{ props.item.normalQty }}, abnormal quantity: {{ props.item.abnormalQty || 0 }}</span>
              </v-tooltip>
            </td>

            <td class="text-xs-left" v-if="isWarehouse">{{ getDisplayOrgId(props.item.organizationKey) }}</td>
            <td class="text-xs-left">                  
              <v-layout>
                {{ props.item.siteName || (getWarehouseName(props.item.warehouseSite)) || '' }}
              </v-layout>
              <v-layout v-if="isWarehouse && props.item.workerName">
                Operator: {{ props.item.workerName }}
              </v-layout>  
            </td>
            <td class="text-xs-left">{{ props.item.createTime ? toTimestampString(props.item.createTime) : ''}}</td>
            
            <td class="text-xs-center">
              <v-layout justify-center no-wrap>
                <v-menu offset-y v-if="isWarehouse">
                  <template v-slot:activator="{ on }">
                    <v-btn v-on="on" icon flat dark color="primary">
                      <v-icon>build</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-tile @click="showResolveAbnormalPackage(props.item)">
                      <v-list-tile-title>Resolve</v-list-tile-title>
                    </v-list-tile>
                    <v-list-tile @click="showEditAbnormalPackage(props.item)">
                      <v-list-tile-title>Update package info</v-list-tile-title>
                    </v-list-tile>
                  </v-list>
                </v-menu>
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-btn v-on="on" icon flat dark color="primary" @click="showAbnormalPackageComments(props.item)">
                      <v-badge :value="checkNewComment(props.item)" color="red" overlap>
                        <template v-slot:badge>
                          <span class="badge">New</span>
                        </template>
                        <v-icon>comment</v-icon>
                      </v-badge>
                    </v-btn>
                  </template>
                  <span> Comments </span>
                </v-tooltip>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-tab-item>
      <v-tab-item value="skuRequests" v-if="activateSkuMode">
        <v-layout v-if="!isWarehouse">
          <v-flex>
            <v-btn color="primary" @click="showSkuRequestDialog">
              <v-icon dark>add</v-icon> Request
            </v-btn>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex xs5 md3>
            <v-text-field
              append-icon="search"
              label="Search"
              single-line
              hide-details
              v-model="filter"
              clearable
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-data-table
          :headers="requestHeaders"
          :items="requests"
          :pagination.sync="pagination"
          :rows-per-page-items="rowPerPage"
          class="elevation-1"
          :search="filter"
        >
          <template v-slot:items="props">
            <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
            <td class="text-xs-left">{{ props.item.sku }}</td>
            <td class="text-xs-left">{{ props.item.upc }}</td>
            <td class="text-xs-left" v-if="isWarehouse">{{ getUpcName(props.item.upc) || props.item.note || ''  }}</td>
            <td class="text-xs-left" v-else>{{ tenantUpcToProductNameMap[props.item.upc] }}</td>
            <td class="text-xs-left" v-if="isWarehouse">{{ (organizations.find(item => item.key === props.item.tenantKey) || {}).displayName }}</td>
            <td class="text-xs-left" v-else>{{ (warehouses.find(item => item.warehouseKey === props.item.warehouseKey) || {}).warehouseName }}</td>
            <td class="text-xs-left" style="white-space: pre-wrap;">{{ props.item.note }}</td>
            <td class="text-xs-center">
              <v-layout justify-center>
                <v-btn 
                  v-if="isWarehouse && !upcMap[props.item.upc]"
                  flat 
                  icon
                  color="primary" 
                  @click="showAddSkuDialog(props.item)"
                ><v-icon>add</v-icon></v-btn>
                <LoaderButton
                  v-else-if="isWarehouse"
                  :buttonIcon="`check_circle`"
                  :flat="true"
                  :promiseAwait="acceptRequest"
                  :promiseItem="props.item"/>
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-btn v-on="on" icon flat dark color="primary" @click="showSkuRequestComments(props.item)">
                      <v-badge :value="checkNewComment(props.item)" color="red" overlap>
                        <template v-slot:badge>
                          <span class="badge">New</span>
                        </template>
                        <v-icon>comment</v-icon>
                      </v-badge>
                    </v-btn>
                  </template>
                  <span> Comments </span>
                </v-tooltip>
                <v-btn 
                  flat 
                  icon
                  color="primary" 
                  @click="removeSkuRequest(props.item)"
                ><v-icon>delete</v-icon></v-btn>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-tab-item>
    </v-tabs-items>
    <WarehouseChangeLogs
      v-model="showChangeLogDialog"
      v-if="showChangeLogDialog"/>
    <UpdatePackageInfoPopup
      v-model="showUpdatePackagesInfoDialog"
      v-if="showUpdatePackagesInfoDialog"
      :actionFunc="saveChanges"
      :packagePairs="updatedPackagePairs"
      :changes="changes"/>
    <AbnormalPackage
      v-model="abnormalPackageToggle"
      v-if="abnormalPackageToggle"
      :title="abnormalPackageTitle"
      :packageInfo="packageInEdit"
      :packageKey="packageInEdit._key"
      :editMode="abnormalPackagesEditMode"
    />
    <ChatRoom
      v-model="commentsDialog"
      title="Package info"
      v-if="commentsDialog"
      :comments="comments"
      :lastReadTime="commentsLastRead"
      :docPath="commentsDocPath"
      enableFileUpload
      :createConnection="!packageInEdit.isAbnormal"
      @realtimeComments="comments => !packageInEdit.isAbnormal && updateSelectedPackageComments(comments)"
    >
      <template v-slot:issue>
        <v-card hover raised>
          <v-card-text>
            <div class="cardTitle"></div>
            <div class="cardText"><b>Note:</b> {{packageInEdit.note}}</div>
            <div v-if="packageInEdit.resolveNote" class="cardText"><b>Resolve note:</b> {{packageInEdit.resolveNote}}</div>
            <v-layout
              v-if="Array.isArray(packageInEdit.attachments) && packageInEdit.attachments.length"
              row wrap>
              <FsFileChip 
                v-for="(file, index) in packageInEdit.attachments"
                :file="file"
                :key="'file' + index"
                width="100%"
                aspect-ratio="1.7"
                class="ma-2"
              />
            </v-layout>
          </v-card-text>
        </v-card>
      </template>
    </ChatRoom>
    <!-- orgNote -->
    <FormSubmitPopup
      v-model="editOrgNoteDialog"
      @popupClose="editOrgNoteDialog = false"
      title="Organization note"
      v-if="editOrgNoteDialog"
      :rightMethod="updateOrgNote"
      rightButtonText="Submit"
    >
      <template v-slot:input>
        <v-container>
          <v-layout mb-3><v-flex>Trackings: {{getTrackingText(packageInEdit.trackings)}}</v-flex></v-layout>
          <v-textarea
            label="Organization note"
            outline
            v-model="orgNoteInEdit"
          >
          </v-textarea>
        </v-container>
      </template>
    </FormSubmitPopup>
    <ProductEdit
      v-if="productDialog"
      v-model="productDialog"
      :product="productInEdit"
      actionText="Add"
      title="Link product"
      :actionFunc="addProduct"
      isLinkMode
    />
    <SkuRequestPopup
      v-if="skuRequestDialog"
      v-model="skuRequestDialog"
      :initRequest="requestInEdit"
    />
    <SkuRequestAddUpcPopup
      v-if="addUpcDialog"
      v-model="addUpcDialog"
      :request="packageInEdit"/>
    <SnArrayEditPopup
      v-model="snEditDialog"
      v-if="snEditDialog"
      :snArray="itemInEdit.snArray"
      @submitted="snChanged"/>
  </v-container>
</template>

<script>
import {toTimestampString, convertTimestampToDateInObj, normalizeInputString} from '../utils/tools'
import PaginationController from './PaginationController'
import LoaderButton from './LoaderButton'
import WarehouseChangeLogs from './WarehouseChangeLogs'
import UpdatePackageInfoPopup from './UpdatePackageInfoPopup'
import AbnormalPackage from './AbnormalPackage'
import ChatRoom from './ChatRoom'
import FsFileChip from './FsFileChip'
import FormSubmitPopup from './FormSubmitPopup'
import ProductEdit from './ProductEdit'
import PackageNoteIconWidget from './PackageNoteIconWidget'
import SkuRequestPopup from './SkuRequestPopup'
import { differenceInDays, isSameDay, startOfDay, addDays } from 'date-fns'
import SkuRequestAddUpcPopup from './SkuRequestAddUpcPopup'
import SnArrayEditPopup from './SnArrayEditPopup'

export default {
  name: 'package',
  components: {
    PaginationController,
    LoaderButton,
    WarehouseChangeLogs,
    UpdatePackageInfoPopup,
    AbnormalPackage,
    ChatRoom,
    FsFileChip,
    FormSubmitPopup,
    ProductEdit,
    PackageNoteIconWidget,
    SkuRequestPopup,
    SkuRequestAddUpcPopup,
    SnArrayEditPopup
  },
  data () {
    return {
      tab: 'byTracking',
      toastColor: 'error',
      toastEnable: false,
      toastText: '',
      picker: null,
      barcode: '',
      packages: [],
      tempPackges: [],
      menuStart: false,
      menuEnd: false,
      dateStart: '',
      dateEnd: '',
      pagination: {},
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      searchFunc: this.searchNow,
      filter: '',
      isUpdateOrgId: false,
      updatedPackages: {},
      packagesByDate: [],
      historyLimit: 50,
      selectedOrganization: '',
      packagesUnlinked: [],
      showChangeLogDialog: false,
      showUpdatePackagesInfoDialog: false,
      packageInEdit: {},
      abnormalPackageToggle: false,
      commentsDialog: false,
      abnormalPackagesEditMode: false,
      editOrgNoteDialog: false,
      orgNoteInEdit: '',
      productDialog: false,
      productInEdit: {},
      refreshTable: false,
      skuRequestDialog: false,
      requestInEdit: null,
      addUpcDialog: false,
      snEditDialog: false,
      itemInEdit: null
    }
  },
  computed: {
    generalSettings () {
      return this.$store.getters.warehouseInfo.generalSettings || {}
    },
    tabs () {
      return (this.isWarehouse && !this.activateSkuMode) ? [
        {displayName: 'By tracking', value: 'byTracking'},
        {displayName: 'By upc/date', value: 'byUpcAndDate'},
        {displayName: 'Unlinked packages', value: 'unlinkedPackages'},
        {displayName: 'Abnormal packages', value: 'abnormalPackages'}
      ] : [
        {displayName: 'By tracking', value: 'byTracking'},
        {displayName: 'By upc/date', value: 'byUpcAndDate'},
        {displayName: 'Unlinked packages', value: 'unlinkedPackages'},
        {displayName: 'Abnormal packages', value: 'abnormalPackages'},
        {displayName: 'Sku requests', value: 'skuRequests'}
      ]
    },
    upcMap () {
      return this.$store.getters.upcMap
    },
    loading () {
      return this.$store.getters.loading
    },
    isWarehouse () {
      return this.$store.getters.activeWarehouse
    },
    updateOrgIdText () {
      return this.isUpdateOrgId ? 'Save' : 'Fix package info'
    },
    organizations () {
      return this.$store.getters.sortedWarehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    updateButtonFunc () {
      return this.isUpdateOrgId ? this.showUpdatePackagesInfo : this.showEditOrgId
    },
    updateButtonDisabled () {
      return !((!this.isUpdateOrgId && this.tempPackges.length > 0) || 
        (this.isUpdateOrgId && Object.keys(this.updatedPackages).length > 0))
    },
    organizationSelect () {
      return [{displayName: '-- All --', organizationId: '', key: ''}, ...this.organizations]
    },
    totalQuantity () {
      let pkgs
      switch (this.tab) {
        case 'byTracking':
          pkgs = this.tempPackges
          break
        case 'byUpcAndDate':
          pkgs = this.packagesByDate
          break
        case 'unlinkedPackages':
          pkgs = this.packagesUnlinked
          break
        case 'abnormalPackages':
          pkgs = this.abnormalPackages
          break
        default:
          pkgs = []
      }
      let quantity = pkgs.reduce((sum, item) => {
        return sum + (item.quantity ? parseInt(item.quantity) : 0)
      }, 0)
      return quantity
    },
    headerFunc () {
      return this.tab === 'unlinkedPackages' ? (isLoadedToEnd) => {
        if (this.isWarehouse) {
          return [
            { text: 'Tracking number', sortable: false, value: 'tracking' },
            { text: 'UPC/SKU(SN)', sortable: false, value: 'upc' },
            { text: 'Description', sortable: false, value: 'desc' },
            { text: `Quantity(${this.totalQuantity + (this.tab === 'unlinkedPackages' || isLoadedToEnd ? '' : '+')})`, sortable: false, value: 'quatity' },
            { text: 'Org ID', sortable: false, value: 'orgId', width: '15%' },
            { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
            { text: 'Claimed', sortable: false, value: 'isConfirmed' },
            { text: 'Linked', sortable: false, value: 'sku' },
            { text: 'Received', sortable: false, value: 'createTime' },
            { text: 'Action', value: '', align: 'center', sortable: false }
          ]
        } else {
          return [
            { text: 'Tracking number', sortable: false, value: 'tracking' },
            { text: 'UPC/SKU(SN)', sortable: false, value: 'upc' },
            { text: 'Description', sortable: false, value: 'desc' },
            { text: `Quantity(${this.totalQuantity + (this.tab === 'byTracking' || isLoadedToEnd ? '' : '+')})`, sortable: false, value: 'quatity' },
            { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
            { text: 'Confirmed', sortable: false, value: 'isConfirmed' },
            { text: 'Linked', sortable: false, value: 'sku' },
            { text: 'Received', sortable: false, value: 'createTime' },
            { text: 'Action', sortable: false, align: 'center', value: 'note' }
          ]
        }
      } : (isLoadedToEnd) => {
        if (this.isWarehouse) {
          return [
            { text: 'Tracking number', sortable: false, value: 'tracking' },
            { text: 'UPC/SKU(SN)', sortable: false, value: 'upc' },
            { text: 'Description', sortable: false, value: 'desc' },
            { text: `Quantity(${this.totalQuantity + (this.tab === 'byTracking' || isLoadedToEnd ? '' : '+')})`, sortable: false, value: 'quatity' },
            { text: 'Org ID', sortable: false, value: 'orgId', width: '15%' },
            { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
            { text: 'Claimed', sortable: false, value: 'isConfirmed' },
            { text: 'Linked', sortable: false, value: 'sku' },
            { text: 'Received', sortable: false, value: 'createTime' },
            { text: 'Action', sortable: false, align: 'center', value: 'note' }
          ]
        } else {
          return [
            { text: 'Tracking number', sortable: false, value: 'tracking' },
            { text: 'UPC/SKU(SN)', sortable: false, value: 'upc' },
            { text: 'Description', sortable: false, value: 'desc' },
            { text: `Quantity(${this.totalQuantity + (this.tab === 'byTracking' || isLoadedToEnd ? '' : '+')})`, sortable: false, value: 'quatity' },
            { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
            { text: 'Confirmed', sortable: false, value: 'isConfirmed' },
            { text: 'Linked', sortable: false, value: 'isAddedToInventory' },
            { text: 'Received', sortable: false, value: 'createTime' },
            { text: 'Action', sortable: false, align: 'center', value: 'sku' }
          ]
        }
      }
    },
    changes () {
      // org key to {upc: qty}
      let changes = {}
      this.updatedPackagePairs.forEach(({oldPackage, newPackage}) => {
        // reverse old pkg qty first
        if (oldPackage.organizationKey) {
          let {organizationKey, upc, quantity, createTime} = oldPackage
          let cur = new Date()
          let createDate = new Date(createTime)
          let storageDays = differenceInDays(cur, createDate)
          storageDays += isSameDay(startOfDay(cur), startOfDay(addDays(createDate, 7))) ? 0 : 1

          if (changes[organizationKey] === undefined) {
            changes[organizationKey] = {[upc]: 0, pkg: 0, unit: {}}
          } else if (changes[organizationKey][upc] === undefined) {
            changes[organizationKey][upc] = 0
          }
          changes[organizationKey][upc] -= quantity * storageDays
          changes[organizationKey].pkg = -1
          if (!changes[organizationKey].unit[upc]) {
            changes[organizationKey].unit[upc] = 0
          }
          changes[organizationKey].unit[upc] -= quantity
        }
        // add new pkg qty
        if (newPackage.organizationKey) {
          let {organizationKey, upc, quantity, createTime} = newPackage
          let cur = new Date()
          let createDate = new Date(createTime)
          let storageDays = differenceInDays(cur, createDate)
          storageDays += isSameDay(startOfDay(cur), startOfDay(addDays(createDate, 7))) ? 0 : 1

          if (changes[organizationKey] === undefined) {
            changes[organizationKey] = {[upc]: 0, pkg: 0, unit: {}}
          } else if (changes[organizationKey][upc] === undefined) {
            changes[organizationKey][upc] = 0
          }
          changes[organizationKey][upc] += quantity * storageDays
          changes[organizationKey].pkg += 1
          if (!changes[organizationKey].unit[upc]) {
            changes[organizationKey].unit[upc] = 0
          }
          changes[organizationKey].unit[upc] += quantity
        }
      })
      return changes
    },
    updatedPackagePairs () {
      return Object.keys(this.updatedPackages).map(key => {
        return {
          newPackage: this.updatedPackages[key],
          oldPackage: this.packages[key],
          tracking: this.barcode
        }
      })
    },
    abnormalPackagesHeader () {
      return this.isWarehouse ? [
        { text: 'Tracking number', sortable: false, value: 'searchKeywords' },
        { text: 'UPC/SKU(SN)', sortable: false, value: 'upc' },
        { text: 'Description', sortable: false, value: 'desc' },
        { text: `Quantity`, sortable: false, value: 'quatity' },
        { text: 'Org ID', sortable: false, value: 'orgId' },
        { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
        { text: 'Received', sortable: false, value: 'createTime' },
        { text: 'Action', sortable: false, align: 'center', value: 'action' }
      ] : [
        { text: 'Tracking number', sortable: false, value: 'searchKeywords' },
        { text: 'UPC/SKU(SN)', sortable: false, value: 'upc' },
        { text: 'Description', sortable: false, value: 'desc' },
        { text: `Quantity`, sortable: false, value: 'quatity' },
        { text: 'Warehouse', sortable: false, value: 'warehouseSite' },
        { text: 'Received', sortable: false, value: 'createTime' },
        { text: 'Action', sortable: false, align: 'center', value: 'action' }
      ]
    },
    abnormalPackages () {
      return this.$store.getters.abnormalPackages.map(item => {
        item.searchKeywords = item.trackings.join(', ')
        return item
      })
    },
    commentsLastRead () {
      if (this.tab === 'byUpcAndDate') {
        return undefined
      }
      return (this.packageInEdit
        && this.packageInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2020-1-1')
    },
    commentsDocPath () {
      if (this.tab === 'skuRequests') return ['skuRequests', this.packageInEdit.key]
      return ['warehouses', this.packageInEdit.warehouseKey, 'packages', this.packageInEdit._key || this.packageInEdit.key]
    },
    comments () {
      return (this.packageInEdit && this.packageInEdit.comments) || []
    },
    abnormalPackageTitle () {
      return this.abnormalPackagesEditMode ? 'Update abnormal package info' : 'Resolve abnormal package'
    },
    requests () {
      return this.$store.getters.skuRequests
    },
    warehouses () {
      return this.$store.getters.warehouses
    },
    requestHeaders () {
      return [
        { text: 'Create time', sortable: false, value: 'createTime' },
        { text: 'SKU', sortable: false, value: 'sku' },
        { text: 'UPC', sortable: false, value: 'upc' },
        { text: 'Product name', sortable: false, value: 'productName' },
        { text: this.isWarehouse ? 'Organization' : 'Warehouse', sortable: false, value: 'name' },
        { text: 'Note', sortable: false, value: 'note' },
        { text: 'Action', value: '', align: 'center', sortable: false }
      ]
    },
    activateSkuMode () {
      return this.$store.getters.activateSkuMode
    },
    getUpcName () {
      return this.$store.getters.getUpcName
    },
    tenantUpcToProductNameMap () {
      return this.$store.getters.tenantUpcToProductNameMap
    },
    products () {
      return this.$store.getters.productsWithUpcChangeableFlag
    },
    maxProductQty () {
      if (this.$store.getters.tenant.maxProductQty === 0) return 0
      return this.$store.getters.tenant.maxProductQty || 1000
    },
    isEnableSnScan () {
      return this.generalSettings.enableSnScan
    }
  },
  watch: {
    searchOption (value) {
      switch (value) {
        case 'tracking':
          this.label = 'Tracking number'
          this.searchFunc = this.searchNow
          return
        case 'upc':
          this.label = 'UPC'
          this.searchFunc = this.searchNow
          return
        default:
          this.label = ''
          this.searchFunc = this.searchNow
      }
    },
    tab (value) {
      this.selectedOrganization = ''
      if (this.tab === 'abnormalPackages') {
        this.pagination.sortBy = 'createTime'
      } else {
        this.pagination.sortBy = null
      }
    },
    abnormalPackages () {
      if (this.packageInEdit && this.packageInEdit._key) {
        const newInEdit = this.abnormalPackages.find(({_key}) => _key === this.packageInEdit._key)
        if (newInEdit === undefined) {
          this.commentsDialog = false
          this.packageInEdit = {}
        } else {
          this.packageInEdit = newInEdit
        }
      }
    },
    abnormalPackageToggle (cur, old) {
      if (!cur) this.abnormalPackagesEditMode = false
    }
  },
  mounted () {
    this.changeTab(this.selectedTab)
    this.$store.dispatch('setLoading', false)
  },
  methods: {
    showSkuRequestDialog (isEdit = false, item) {
      this.skuRequestDialog = true
      if (isEdit) {
        this.requestInEdit = item
      } else if (item) {
        this.requestInEdit = {
          ...item
        }
      } else {
        this.requestInEdit = null
      }
    },
    showAddSkuDialog (item) {
      this.addUpcDialog = true
      this.packageInEdit = item
    },
    showUpdatePackagesInfo () {
      this.showUpdatePackagesInfoDialog = true
    },
    clearData () {
      this.packages = {}
      this.tempPackges = []
    },
    searchNow () {
      this.$store.dispatch('setLoading', true)
      this.clearData()
      if (!this.barcode || this.barcode === '*') {
        this.$store.dispatch('setLoading', false)
        return
      }
      this.searchTracking()
    },
    searchTracking () {
      this.search([{
        field: `trackings`,
        compare: 'array-contains',
        value: this.barcode.trim().toUpperCase()
      }])
    },
    search (predicates) {
      predicates.forEach((element) => {
        let field = element.field
        let compare = element.compare
        let value = element.value
        this.doSearch([{field, compare, value}])
      })
    },
    getWarehouses () {
      let warehouses = []
      if (this.$store.getters.activeWarehouse) {
        warehouses = [this.$store.getters.activeWarehouse]
      } else if (this.$store.getters.warehouses.length > 0) {
        warehouses = this.$store.getters.warehouses.map(warehouse => warehouse.warehouseKey)
      }
      return warehouses
    },
    doSearch (predicates = []) {
      let payload
      if (this.$store.getters.activeOrganization) {
        // limit to org
        predicates.push({
          field: 'organizationKey',
          compare: '==',
          value: this.$store.getters.activeOrganization
        })
        payload = {predicates}
      } else {
        payload = {
          predicates,
          path: ['warehouses', this.$store.getters.activeWarehouse, 'packages']
        }
      }
      return this.$store.dispatch('searchPackages', payload)
        .then(pkgQuerySnapshot => {
          pkgQuerySnapshot.forEach(doc => {
            this.tempPackges.push({
              ...this.transformData(doc), 
              warehouseKey: doc.ref.path.split('/')[1]
            })
          })
          this.$store.dispatch('setLoading', false)
        })
        .catch(
          (error) => {
            console.log(error)
          }
        )
    },
    getDisplayOrgId (organizationKey) {
      let org = this.$store.getters.getWarehouseOrganizationsByKey(organizationKey)
      return org ? `${org.tenantName} (${org.organizationId})` : '---'
    },
    transformData (doc) {
      const obj = convertTimestampToDateInObj(doc.data())
      let org = this.$store.getters.getWarehouseOrganizationsByKey(obj.organizationKey)
      let orgId = org ? `${org.tenantName} (${org.organizationId})` : '---'
      let date = obj.createTime || obj.date
      let aPackage = {
        key: doc.id,
        organizationKey: obj.organizationKey,
        upc: obj.upc,
        attachments: obj.attachments || [],
        comments: obj.comments || [],
        quantity: obj.quantity,
        orgId,
        trackings: obj.trackings,
        warehouseSite: obj.warehouseSite || '',
        siteName: obj.siteName,
        isConfirmed: obj.isConfirmed,
        isAddedToInventory: obj.isAddedToInventory,
        confirmedTime: obj.confirmedTime ? toTimestampString(obj.confirmedTime) : 'Confirm time missing',
        note: obj.note || '',
        resolveNote: obj.resolveNote || '',
        isAbnormal: obj.isAbnormal || false,
        workerKey: obj.workerKey || '',
        workerName: obj.workerName || '',
        snArray: obj.snArray || []
      }
      date && (aPackage.createTime = date) // CreateTime is removed when deleted
      if (!this.isWarehouse) aPackage.orgNote = obj.orgNote || ''
      if (aPackage.isAbnormal) aPackage.abnormalQty = obj.abnormalQty
      this.packages[aPackage.key] = aPackage
      return aPackage 
    },
    getWarehouseName (key) {
      let theWarehouse = key && this.$store.getters.warehousesSites.find((element) => {
        return element.key === key
      })
      console.log('found warehouse: ', theWarehouse)
      return theWarehouse && theWarehouse.name
    },
    getProductName (item) {
      let productName = '*New product*'
      if (this.isWarehouse) {
        this.upcMap[item.upc] && (productName = this.upcMap[item.upc].description)
      } else {
        let product = this.$store.getters.products.find(product => {
          return product.upc && item.upc && product.upc.toUpperCase() === item.upc.trim().toUpperCase()
        })
        product && (productName = `${product.condition} - ${product.name}`)
      }

      return productName
    },
    getTrackingText (trackings) {
      return trackings.join(', ')
    },
    toTimestampString (date) {
      let dateString
      try {
        dateString = toTimestampString(date)
      } catch (error) {
        console.log('convert to date string error: ' + JSON.stringify(date))
        console.log(error)
        dateString = 'error'
      }
      return dateString
    },
    showEditOrgId () {
      this.isUpdateOrgId = true
    },
    getUpdateStyle (item) {
      return item.organizationKey === this.packages[item.key].organizationKey ? 'min-width: 10px; color: black;' : 'min-width: 10px; color: black; background-color: yellow;'
    },
    getUpcStyle (item) {
      return item.upc === this.packages[item.key].upc ? '' : 'package highlight'
    },
    getQtyStyle (item) {
      return item.quantity === this.packages[item.key].quantity ? '' : 'package highlight'
    },
    resetOneOrgId (item) {
      item.organizationKey = this.packages[item.key].organizationKey
      this.$delete(this.updatedPackages, item.key)
    },
    cancelChanges () {
      this.isUpdateOrgId = false
      this.updatedPackages = {}
      this.tempPackges = Object.values(this.packages).map(pkg => {
        return {...pkg}
      })
    },
    organizationChanged (event, item) {
      // be careful, onChange happens before v-model
      if ((item.upc === this.packages[item.key].upc && item.quantity === this.packages[item.key].quantity) && this.packages[item.key].organizationKey === item.organizationKey) {
        this.$delete(this.updatedPackages, item.key)
      } else {
        this.$set(this.updatedPackages, item.key, item)
        if (!event) { 
          // do next tick only because onchanged happened before v-model. So have to update in the next cycle
          this.$nextTick(() => { item.organizationKey = '' })
        }
      }
    },
    upcOrQtyChanged (event, field, item) {
      // be careful, onChange happens before v-model
      if ((item.upc === this.packages[item.key].upc && item.quantity === this.packages[item.key].quantity) && this.packages[item.key].organizationKey === item.organizationKey) {
        this.$delete(this.updatedPackages, item.key)
      } else {
        if (!item.quantity) item.quantity = 0
        if (!item.upc) item.upc = ''
        this.$set(this.updatedPackages, item.key, item)
        // if (!event) { 
        //   let convertedItem = {...item, [field]: field === 'quantity' ? 0 : ''}
        //   // do next tick only because onchanged happened before v-model. So have to update in the next cycle
        //   this.$nextTick(() => this.$set(this.updatedPackages, item.key, convertedItem))
        // }
      }
    },
    async saveChanges () {
      let newPackages = Object.values(this.updatedPackages)
      let oldPackages = Object.keys(this.updatedPackages).map(key => {
        if (!this.packages[key].organizationKey) {
          this.packages[key].organizationKey = ''
        }
        return this.packages[key]
      })
      let firstWarehouseSite = newPackages[0].warehouseSite
      newPackages.forEach(pkg => {
        pkg.quantity || (pkg.quantity = 0)
      })
      let isSameWarehouseSite = newPackages.every(pkg => pkg.warehouseSite === firstWarehouseSite)
      if (!isSameWarehouseSite) {
        alert('You can only modify packages from the same warehouse site at a time.')
        return
      }
      let negativeQtyOrgKeynUpcArray = await this.$store.dispatch('willChangeCauseNegativeInventory', {newPackages, oldPackages})
      if (negativeQtyOrgKeynUpcArray.length > 0) {
        if (!confirm('The operation will result in negative inventory quantity. Do you want to continue?')) return
      }
      return this.dispatchAndToast(this.$store.dispatch('updatePackagesInfo', {oldPackages, newPackages})
        .then((rtn) => {
          let newPkgs = rtn || newPackages
          this.isUpdateOrgId = false
          this.updatedPackages = {}
          this.searchNow()
          if (rtn) throw Error(` ${newPkgs.length} confirmed pakages found, ${newPackages.length - newPkgs.length} packages proceeded.`)
        }), 'Update packages information')
    },
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed,` + error.message})
        })
    },
    deletePackage (item) {
      if (!confirm('The package will be deleted from this page, are you sure about that?')) return Promise.resolve()
      return this.$store.dispatch('deletePackage', item)
        .then(() => {
          this.packagesUnlinked = this.packagesUnlinked.filter(pkg => pkg !== item)
        })
    },
    showFlagText (props) {
      return (props.item.note + (props.item.resolveNote ? ` | ${props.item.resolveNote}` : '')) || 
       'Open to see detail'
    },
    showEditAbnormalPackage (abnormalPackage) {
      this.abnormalPackagesEditMode = true
      this.showResolveAbnormalPackage(abnormalPackage)
    },
    showResolveAbnormalPackage (abnormalPackage) {
      this.packageInEdit = abnormalPackage
      this.abnormalPackageToggle = true
    },
    showAbnormalPackageComments (abnormalPackage) {
      this.packageInEdit = abnormalPackage
      this.commentsDialog = true
    },
    showSkuRequestComments (item) {
      this.packageInEdit = item
      this.commentsDialog = true
    },
    checkNewComment (request) {
      let lastReadTime = request[`lastRead_${this.$store.getters.uid}`]
      let hasOnlyInitialComment = request.comments && request.comments.length === 1 && request.comments[0].initialComment
      let lastMessageTime = request.comments && request.comments.length > 0 && request.comments.slice(-1)[0].createTime

      return !hasOnlyInitialComment && !!lastMessageTime && (!lastReadTime || lastReadTime < lastMessageTime)
    },
    changeTab (tabName) {
      this.tab = tabName
    },
    showNoteAndComments (packageItem) {
      this.packageInEdit = this.abnormalPackages.find(pkg => pkg._key === packageItem.key) || packageItem
      this.commentsDialog = true
    },
    checkPackageNote (pkg = {}) {
      return pkg.isAbnormal || 
        (pkg.note && pkg.note.length) || 
        (pkg.resolveNote && pkg.resolveNote.length) || 
        (Array.isArray(pkg.comments) && pkg.comments.length) || 
        (Array.isArray(pkg.attachments) && pkg.attachments.length)
    },
    editOrgNote (pkg = {}) {
      this.editOrgNoteDialog = true
      this.orgNoteInEdit = pkg.orgNote || ``
      this.packageInEdit = pkg
    },
    updateOrgNote () {
      if (this.orgNoteInEdit !== undefined) {
        this.$store.dispatch('updatePackageOrgNote', {
          pkgKey: this.packageInEdit.key || this.packageInEdit._key,
          warehouseSite: this.packageInEdit.warehouseSite,
          orgNote: this.orgNoteInEdit 
        })
          .then(() => { this.tab !== 'unlinkedPackages' && (this.packageInEdit.orgNote = this.orgNoteInEdit) })
      }
    },
    /** @param {string} upc **/
    editProduct (upc = '') {
      this.productInEdit = {upc}
      this.productDialog = true
    },
    addProduct (product, isTriggerProcessPackage = false) {
      if (this.products.length >= this.maxProductQty) {
        throw Error(`Reach ${this.maxProductQty} active products limit. Please archive old products. If you need to create more than ${this.maxProductQty} products, please contact you account manager.`)
      }
      !product.upc && (product.upc = '')
      product.asin && (product.asin = product.asin.map(asin => {
        return asin.trim()
      }))
      delete product.onlyForSearch
      return (product.id ? this.$store.dispatch('editProduct', {newProduct: product, isTriggerProcessPackage}) : 
        this.$store.dispatch('addProduct', {...product, inbound: 0, quantity: 0, isArchived: false}))
        .then(() => {
          this.searchNow()
          this.refreshTable = !this.refreshTable
          // from tab to query package again?
        })
    },
    updateSelectedPackageComments (comments) {
      switch (this.tab) {
        case 'byTracking':
          (this.tempPackges
            .find(item => 
              (item.key && item.key === this.packageInEdit.key) ||
              (item._key && item._key === this.packageInEdit._key)
            ) || {}
          ).comments = comments
          return
        case 'byUpcAndDate':
          (this.packagesByDate
            .find(item => 
              (item.key && item.key === this.packageInEdit.key) || 
              (item._key && item._key === this.packageInEdit._key)
            ) || {}
          ).comments = comments
          return
        case 'unlinkedPackages':
          (this.packagesUnlinked
            .find(item => 
              (item.key && item.key === this.packageInEdit.key) ||
              (item._key && item._key === this.packageInEdit._key)
            ) || {}
          ).comments = comments
      }
    },
    normalizeInputString,
    removePackage (item) {
      if (!confirm('Are you sure to remove this self-upload package?')) return Promise.resolve()
      return this.$store.dispatch('removePackage', item)
        .then((rtn) => {
          if (rtn === 'cancel') return
          this.tempPackges = this.tempPackges.filter(pkg => pkg !== item)
          this.packagesByDate = this.packagesByDate.filter(pkg => pkg !== item)
        })
    },
    removeSkuRequest (item) {
      if (!confirm('Are you sure to remove this request?')) return Promise.resolve()
      return this.$store.dispatch('removeSkuRequest', item)
    },
    acceptRequest (item) {
      if (!confirm('Are you sure to accept this request?')) return Promise.resolve()
      return this.$store.dispatch('acceptSkuRequest', item)
    },
    showBadge (tabItem) {
      switch (tabItem) {
        case 'skuRequests':
          return !!this.isWarehouse && this.requests.length > 0
        default:
          return false
      }
    },
    showSnEditDialog (item) {
      this.itemInEdit = item
      this.snEditDialog = true
    },
    snChanged (event) {
      this.$set(this.itemInEdit, 'snArray', event)
      this.$set(this.updatedPackages, this.itemInEdit.key, this.itemInEdit)
    }
  },
  props: {
    selectedTab: String
  }
}
</script>

<style>
  .wms-mt-5 {
    margin-top: -50px;
  }

  .wms-mt-3 {
    margin-top: -30px;
  }

  .package.highlight input[type="text"] {
    background-color : yellow
  }

  .badge {
    font-size: 10px;
  }

  .link-button {
     width: 20px !important;
     height: 20px !important; 
     margin: 0px !important;
  }

  .notification .v-badge__badge{
    width: 5px;
    height: 5px;
    top: -3px;
    right: -5px;
  }
</style>

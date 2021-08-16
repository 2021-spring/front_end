jest.mock('../../../src/utils/dbAccessor')
jest.mock('../../../src/utils/tools')

import {dbAccessor} from '../../../src/utils/dbAccessor'
import {Logger} from '../../../src/utils/tools'

import { shallowMount } from '@vue/test-utils'
import BillingSettings from '@/components/BillingSettings'
import {actions} from '@/store/warehouse/index'

dbAccessor.updateFieldsStore.mockReturnValue(Promise.resolve())
dbAccessor.getNewDocumentKey.mockReturnValue(Promise.resolve({id: '123456'}))
Logger.changeLog.mockReturnValue(Promise.resolve())

describe('BillingSettings.vue', () => {
  let stubs
  beforeEach(() => {
    stubs = {
      mocks: {
        $store: {
          getters: {
            warehouseInfo: {
              lastModifiedTime: { seconds: 1563241329, nanoseconds: 899000000 },
              name: 'YuWarehouse',
              rates: {
                inPackageFee: 2,
                inUnitFee: 0,
                largeItemStorageFee: 0,
                mediumItemStorageFee: 0,
                memberShipFee: 0,
                outPackageFee: 0,
                outUnitFee: -1234,
                overSizeItemStorageFee: 0,
                smallItemStorageFee: 0,
                storageFeeExemptionPeriod: 0
              },
              tierDiscounts: {
                Aq4aCLem5IHWLeMHG044: {
                  discountRate: 321,
                  threshold: 'asd'
                },
                J7ygkSqFENOhjfuf3Vm9: {
                  discountRate: 44,
                  threshold: 44
                },
                JKtxYXTNaRdTROuEdv85: {
                  discountRate: 22,
                  threshold: 33
                },
                Lifhv9q7a6mhtBvwt3LQ: {
                  discountRate: 33,
                  threshold: 33
                }
              },
              users: [
                {
                  email: 'yu.wang@viteusa.com',
                  name: 'YuWarehouse'
                },
                {
                  email: 'wang.yu4@husky.neu.edu',
                  name: 'YuUser'
                }
              ]
            }
          }
        }
      },
      propsData: {}
    }
  })
  describe('BillingSettings is propoerly mounted.', () => {
    let wrapper

    beforeEach(() => {
      wrapper = shallowMount(BillingSettings, stubs)
    })

    it('is properly mounted', () => {
      expect(wrapper.name()).toBe('BillingSettings')
    })
    it('computed <tierDiscounts> performs well', () => {
      const expectedValue = [
        {
          key: 'Aq4aCLem5IHWLeMHG044',
          discountRate: 321,
          threshold: 'asd'
        },
        {
          key: 'J7ygkSqFENOhjfuf3Vm9',
          discountRate: 44,
          threshold: 44
        },
        {
          key: 'JKtxYXTNaRdTROuEdv85',
          discountRate: 22,
          threshold: 33
        },
        {
          key: 'Lifhv9q7a6mhtBvwt3LQ',
          discountRate: 33,
          threshold: 33
        }
      ]
      expect(wrapper.vm.tierDiscounts).toEqual(expectedValue)
    })

    it('computed <rates> performs well', () => {
      const expectedValue = {
        inPackageFee: 2,
        inUnitFee: 0,
        largeItemStorageFee: 0,
        mediumItemStorageFee: 0,
        memberShipFee: 0,
        outPackageFee: 0,
        outUnitFee: -1234,
        overSizeItemStorageFee: 0,
        smallItemStorageFee: 0,
        storageFeeExemptionPeriod: 0
      }
      expect(wrapper.vm.rates).toEqual(expectedValue)
    })

    it('computed <thresholds> performs well', () => {
      const expectedValue = ['asd', 44, 33, 33]
      expect(wrapper.vm.thresholds).toEqual(expectedValue)
    })

    it('renders the outbound per unit', () => {
      expect(wrapper.html()).toContain('-1234')
    })
  })

  describe('BillingSettings popups perform well.', () => {
    let wrapper

    beforeEach(() => {
      wrapper = shallowMount(BillingSettings, stubs)
    })

    it('Edit is properly mounted', () => {
      expect(wrapper.vm.billingRatesDialog).toBe(false)
      wrapper.vm.showBillingRatesDialog()
      expect(wrapper.vm.billingRatesDialog).toBe(true)
    })

    it('Add is properly mounted', () => {
      expect(wrapper.vm.editDiscountDialog).toBe(false)
      wrapper.vm.showEditDiscountDialog({})
      expect(wrapper.vm.editDiscountDialog).toBe(true)
    })
  })
})

describe('actions', () => {
  const commit = {}
  const getters = {
    activeWarehouse: '333', 
    warehouseInfo: {
      rates: {
        inPackageFee: 2,
        inUnitFee: 0,
        largeItemStorageFee: 0,
        mediumItemStorageFee: 0,
        memberShipFee: 0,
        outPackageFee: 0,
        outUnitFee: -1234,
        overSizeItemStorageFee: 0,
        smallItemStorageFee: 0,
        storageFeeExemptionPeriod: 0
      },
      tierDiscounts: {}
    }
  }

  let payload = {}
  let updateSpy

  it('updateBillingRates works well', () => {
    actions.updateBillingRates({commit, getters}, payload)
    expect(dbAccessor.updateFieldsStore).toHaveBeenCalledWith({rates: payload}, 'warehouses', getters.activeWarehouse)
  })

  it('editTierDiscount works well', async () => {
    payload = {key: 'aaa'}
    await actions.editTierDiscount({commit, getters}, payload)
    expect(dbAccessor.updateFieldsStore).toHaveBeenCalledWith({tierDiscounts: {aaa: {}}}, 'warehouses', getters.activeWarehouse)
  })
})
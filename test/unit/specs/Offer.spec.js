import { shallowMount } from '@vue/test-utils'
import OfferWidget from '@/components/OfferWidget'
import OfferTable from '@/components/OfferTable'
import Offer from '@/components/Offer'

describe('OfferWidget.vue', () => {
  let stubs
  beforeEach(() => {
    stubs = {
      mocks: {
        $store: {
          getters: {
            activeOrganization: true
          }
        }
      },
      propsData: {
        isExpired: true,
        isHistory: false,
        expirationDate: new Date(1990,0,8)
      }
    }
  })
  describe('when activeOrganization is true, i.e. it is a tenant', () => {
    let wrapper
    beforeEach(() => {
      wrapper = shallowMount(OfferWidget, stubs)
    })
    it('renders the people icon', () => {
      expect(wrapper.html()).toContain('people')
    })
  })

  describe('when activeOrganization is false, i.e. it is a user', () => {
    let wrapper
    beforeEach(() => {
      stubs.mocks.$store.getters.activeOrganization = false
      wrapper = shallowMount(OfferWidget, stubs)
    })
    it('It does not render the people icon if this components used by a user', () => {
      expect(wrapper.html()).not.toContain('people')
    })
  })

  it('is properly mounted', () => {    
    const wrapper = shallowMount(OfferWidget, stubs)
    expect(wrapper.name()).toBe('OfferWidget')
  })
  it('computed <titleClass> performs well', () => {    
    const wrapper = shallowMount(OfferWidget, stubs)
    expect(wrapper.vm.titleClass).toBe('body-2 line-through')
  })
  it('computed <expirationDateString> performs well', () => {    
    const wrapper = shallowMount(OfferWidget, stubs)
    expect(wrapper.vm.expirationDateString).toBe('01/08/1990')
  })
})

describe('Offer.vue', () => {
  let stubs
  beforeEach(() => {
    stubs = {
      mocks: {
        $store: {
          getters: {
            activeOrganization: true,
            offers: [{
              isExpired: false,
              isNotifyMembers: true,
              isPublic: true,
              key: "0002",
              price: 2000,
              productCondition: "new",
              productId: "00000001",
              productName: "Mercedes BenZ C300 4-matic Black/Black",
              quantity: 111,
              taken: 0
            }],
            proposes: [{
              isExpired: false,
              isNotifyMembers: true,
              isPublic: true,
              key: "0002",
              price: 2000,
              productCondition: "new",
              productId: "00000001",
              productName: "Mercedes BenZ C300 4-matic Black/Black",
              quantity: 111,
              taken: 0,
              comments: [
                {content: '1231231231'}
              ],
              lastRead_HG0EogvNPzZa48uAdjd1e1m8skB3: new Date('2018-01-01')
            }],
            warehouses: [{
              sites: [{siteName: 'Home1'}, {siteName: 'Work1'}]
            },{
              sites: [{siteName: 'Home2'}, {siteName: 'Work2'}]
            }],
            reportLost: [{productName: 'Mercedes'}],
            uid: 'HG0EogvNPzZa48uAdjd1e1m8skB3',
            products: [{id: '123'}, {id: '111'}]
          },
          dispatch: (actionName, payload) => {actionName, payload}
        }
      }
    }
  })

  describe('Computed', () => {
    let wrapper
    beforeEach(()=> {
      wrapper = shallowMount(Offer, stubs)
    })
    it('<comments> performed well', () => {
      expect(wrapper.vm.proposes[0].comments[0].content).toEqual('1231231231')
    })
    it('<commentLastRead> performed well', () => {
      expect(wrapper.vm.commentLastRead).toEqual(new Date('2018-1-1'))
    })
    it('<warehouseSites> performed well', () => {
      expect(wrapper.vm.warehouseSites).toEqual([{siteName: 'Home1'}, {siteName: 'Work1'}, {siteName: 'Home2'}, {siteName: 'Work2'}])
    })
    it('<getProduct> performed well', () => {
      expect(wrapper.vm.getProduct('111')).toEqual({id: '111'})
    })
  })

  describe('when activeOrganization is true, i.e. it is a tenant', () => {
    let wrapper
    beforeEach(()=> {
      wrapper = shallowMount(Offer, stubs)
    })
    it('has the <Archived> tab', () => {
      expect(wrapper.vm.tabs).toContain('Archived')
    })
  
    it('does not have the <Expired> tab', () => {
      expect(wrapper.vm.tabs).not.toContain('Expired')
    })
  })

  describe('when activeOrganization is false, i.e. it is a user', () => {
    let wrapper
    beforeEach(() => {
      stubs.mocks.$store.getters.activeOrganization = false
      wrapper = shallowMount(Offer, stubs)
    })
    it('does not have the <Archived> icon', () => {
      expect(wrapper.vm.tabs).not.toContain('Archived')
    })
  
    it('has the <Expired> select', () => {
      expect(wrapper.vm.tabs).toContain('Expired')
    })
  })

  // it's also easy to check for the existence of elements
  it('is properly mounted', () => {    
    const wrapper = shallowMount(Offer, stubs)
    expect(wrapper.name()).toBe('Offer')
  })

  it('buttons performs well', () => {
    const wrapper = shallowMount(Offer, stubs)
    wrapper.setData({ tab: '3' })
    // const button = wrapper.find(v-flex)
    expect(wrapper.vm.tab).toBe('3')
    expect(wrapper.html()).toContain('offertable')
    // button.trigger('click')
    // expect(wrapper.vm.addOfferDialog).toBe(true)
  })
})

describe('OfferTable.vue', () => {
  let stubs
  beforeEach(() => {
    stubs = {
      propsData: {
        offers: [{
          isExpired: false,
          isNotifyMembers: true,
          isPublic: true,
          key: "0002",
          price: 2000,
          productCondition: "new",
          productId: "00000001",
          productName: "Mercedes BenZ C300 4-matic Black/Black",
          quantity: 111,
          taken: 0
        }],
        isPropose: true
      },
      mocks: {
        $store: {
          getters: {
            activeOrganization: false,
            products: [],
            tenantWorkFor: []
          }
        }
      }
    }
  })
  it('v-data-table is well mounted', () => {
    const wrapper = shallowMount(OfferTable, stubs)
    expect(wrapper.html()).toContain('v-data-table')
  })
  it('v-data-table data computed well', () => {
    const wrapper = shallowMount(OfferTable, stubs)
    expect(wrapper.vm.selectedOffers).toContainEqual({...stubs.propsData.offers[0]})
  })
  it('v-data-table data header mounted well', () => {
    const wrapper = shallowMount(OfferTable, stubs)
    expect(wrapper.vm.headers).toEqual([
      { text: 'ID#', align: 'left', sortable: false, value: 'key', width: '5%' },
      { text: 'Organization', value: 'tenantName', align: 'left', sortable: false, width: '10%' },
      { text: 'Offer', value: 'productName', align: 'left', sortable: false },
      { text: 'Price', value: 'price', align: 'left', sortable: false },
      { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
      { text: 'Action', value: 'note', align: 'center', sortable: false, width: '8%' }
    ])
  })

})
import { shallowMount } from '@vue/test-utils'
import App from "@/App"

describe("App.vue", () => {
  let wrapper = shallowMount(App, {
    stubs: ['router-link', 'router-view']
  })

  it('App.vue mounted successfully', () => {
    expect(wrapper.name()).toBe('App')
  })
})
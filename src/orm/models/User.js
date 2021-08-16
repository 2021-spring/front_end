import ViteModel from './ViteModel'

export default class User extends ViteModel {
  static _basePathTemplate = 'users'

  constructor (data) {
    super(data)
    this._basePath = this.constructor._basePathTemplate.split('/')
    if (data._key) {
      this._fullPath = [...this.constructor._basePath, data._key]
    }
  }
  static removeFromSetArray (obj, key) {
    return ViteModel.removeFromSetArray(obj, [User._basePathTemplate, key])
  }
}

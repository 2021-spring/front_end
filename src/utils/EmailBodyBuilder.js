import linkifyHtml from 'linkifyjs/html'
export default class EmailBodyBuilder {
  /**
   * @param {string} string
   * @param {{[key: string]: string}} varList
   */
  constructor (string = '', varList = {}, attachments = []) {
    this.string = string
    this.varList = varList
    this.attachments = attachments
  }

  /**
   * @param {string} key
   */
  varRegExp (key = '') {
    return new RegExp(`#{${key}}`, 'ig')
  }

  toString () {
    let output = this.string
    Object.keys(this.varList).forEach(key => {
      output = output.replace(this.varRegExp(key), this.varList[key])
    })
    return output
  }

  setAttachments () {
    if (this.attachments.length) {
      return this.attachments
        .map(file => {
          if (file.downloadURL) return `<a href="${file.downloadURL}"> ${file.name} </a>`
          return ''
        })
    }
    return []
  }
  
  showTemplate () {
    return linkifyHtml(this.toString(), {
      defaultProtocol: 'https'
    })
  }

  toEmail () {
    let attachmentsTemplate = this.setAttachments().filter(link => link.length).join('\n')
    if (attachmentsTemplate.length > 0) {
      attachmentsTemplate = '<br><br><b> Attachments: </b> \n' + attachmentsTemplate
    }
    return this.showTemplate().concat('\n', attachmentsTemplate)
  }
}

/**
 * 
 * @typedef {Object} Site
 * @property {string} address1
 * @property {string} address2
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 */

/**
 * 
 * @param {Array<Site>} sites 
 * @param {*} orgId 
 */
export function createSiteAddressSample (sites = [], orgId = '') {
  return sites.map((site, index) => 
    `\n\tSite${index + 1}: ${site.address1}${site.address2 ? (', ' + site.address2) : ''}, Unit ${orgId}, ${site.city}, ${site.state}, ${site.zip}`
  ).join('')
}

module.exports = {
  /** 
   * format date string to ISO time string like 'yyyy-mm-dd'
   * @param {string} dateString 
   */
  formatDateString (dateString) {
    let date = new Date(dateString)
    return new Date(date.getTime() - date.getTimezoneOffset() * 600000).toISOString().slice(0, 10)
  }
}

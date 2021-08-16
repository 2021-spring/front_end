function isNumber (text) {
  const pattern = /^\d+$/
  return pattern.test(text)
}

export {isNumber}

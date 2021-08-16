import JsBarcode from 'jsbarcode'
/**
 * 
 * @param {File} file 
 * @param {{
 *  width?: number,
 *  height?: number, // no use now
 *  quantity?: number
 * }} options 
 * @param {(imgFile: File) => void} successFunc
 * @param {(err: Error) => void} [failFunc]
 */
export function imageResize (file, options, successFunc, failFunc) {
  if (!(file.type || '').includes('image')) {
    throw Error('file type must be image')
  }

  const {width = 0, height = 0, quantity = 0.7} = options
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = (readerEvent) => {
    const img = new Image()
    img.src = readerEvent.target.result
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        setImageCanvasResolution(img, canvas, width, height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.canvas.toBlob((blob) => {
          const blobFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          successFunc && successFunc(blobFile)
          canvas.remove()
          img.remove()
        }, 'image/jpeg', quantity)
      } catch (error) {
        failFunc && failFunc(error)
      }
    }
  }
}

/**
 * 
 * @param {Image} imgElement 
 * @param {HTMLCanvasElement} canvas 
 * @param {number} [width]
 * @param {number} [height]
 */
function setImageCanvasResolution (imgElement, canvas, width, height) {
  const imgWidth = imgElement.width
  const imgHeight = imgElement.height
  const aspectRatio = imgWidth / imgHeight
  let outputWidth = (width > imgWidth) ? imgWidth : width
  let outputHeight = outputWidth / aspectRatio
  
  canvas.width = outputWidth
  canvas.height = outputHeight
}

/**
 * 
 * @param {String} barcode 
 * @param {String} fileName 
 */
export function saveBarcodeImage (barcode, fileName, isPrint) {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, barcode, {
    text: fileName,
    width: 3
  })
  canvas.toBlob(blob => {
    const dataUrl = (window.webkitURL || window.URL).createObjectURL(blob)
    if (isPrint) {
      const win = window.open(dataUrl, '_blank')
      win.print()
      setTimeout(() => { win.close() }, 200)
      return
    }

    const anchor = document.createElement('a')
    anchor.download = `barcode-${fileName}.jpeg`
    anchor.href = dataUrl
    anchor.dataset.downloadurl = ['image/jpeg', anchor.download, anchor.href].join(':')
    anchor.click()
    canvas.remove()
    anchor.remove()
  }, 'image/jpeg', 0.8)
}

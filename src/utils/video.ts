/** Reads a video file's duration client-side (no upload/server round trip)
 *  by loading it into an off-DOM `<video>` element just long enough to read
 *  its metadata. Rejects if the browser can't decode the file at all. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de lire cette vidéo.'))
    }
  })
}

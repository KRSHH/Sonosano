let backendUrl = 'http://127.0.0.1:8000'

export const getBackendUrl = () => {
  const storedUrl = localStorage.getItem('backendUrl')
  if (storedUrl) {
    backendUrl = storedUrl
  }
  return backendUrl
}

export const setBackendUrl = (url: string) => {
  backendUrl = url
  localStorage.setItem('backendUrl', url)
}
import useStore from './app/store'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const {studies, studiesStatus, studiesStatusResolvers} = useStore()
    const scanStudies = await (await import('./app/(api)/operation/scan_studies')).default
    scanStudies(studies, studiesStatus, studiesStatusResolvers)
  }
}

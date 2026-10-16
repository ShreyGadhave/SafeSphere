/**
 * MapLibre with an explicit worker URL. MapLibre v6 starts a module Worker from a path relative to
 * its own file; Vite's dependency pre-bundling moves that file, so the dev server failed with
 * "Worker failed to load". Importing the worker as a URL asset makes Vite serve and hash it.
 */
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)

export * from 'maplibre-gl'

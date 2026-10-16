import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function MapScreen() {
  return (
    <PlaceholderScreen
      title="Safety map"
      description="MapLibre + OpenFreeMap tiles with the ML-1 risk heatmap."
      planned={["Risk heatmap with time-of-day slider","Community incident markers (clustered)","Police stations, hospitals from OSM","Area safety card with SHAP reasons","Safest route (ML-2)"]}
      withTabBar
    />
  );
}

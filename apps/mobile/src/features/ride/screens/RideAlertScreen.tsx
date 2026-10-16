import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function RideAlertScreen() {
  return (
    <PlaceholderScreen
      title="Your cab left the route"
      description="Check-in shown when Safe Ride detects an anomaly."
      planned={["Countdown ring","I'm OK → PIN","Send SOS now","Anomaly reason + score"]}
    />
  );
}

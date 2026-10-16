import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function RideScreen() {
  return (
    <PlaceholderScreen
      title="Safe Ride"
      description="Share your cab trip from Uber/Ola (or paste the link) and SafeSphere watches the ride."
      planned={["Parse driver, plate, destination","Confirm missing details (never guessed)","Expected routes from OSRM","Background monitoring with ML-5"]}
    />
  );
}

export { SosScreen } from './screens/SosScreen';
export { SosActiveScreen } from './screens/SosActiveScreen';
export { FakeCallScreen } from './screens/FakeCallScreen';
export { SosProvider, triggerSos, useSos, type TriggerOptions } from './state/SosProvider';
export { refreshSosRecipients, readCachedRecipients, type SosRecipients } from './services/recipients';
export { flushOutbox } from './services/outbox';
// Background tasks are registered by importing '@/features/sos/tasks' once at app start.

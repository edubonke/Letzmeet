import { registerRootComponent } from 'expo';
import DemoApp from './App';
import LiveSandboxApp from './LiveApp';

// Preserve the original Letzmeet team demo by default.
// This alternate integration experience is only for synthetic-data local tests.
registerRootComponent(process.env.EXPO_PUBLIC_LETZMEET_SANDBOX === '1' ? LiveSandboxApp : DemoApp);

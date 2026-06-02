import { ThemeProvider } from '@/theme/ThemeProvider';
import { ModalRoot } from '@/components/feedback/ModalRoot';
import { AppRouter } from '@/router';

/**
 * Application root. Establishes Arabic/RTL + theme at the document level,
 * mounts the route tree, and renders the single global modal portal above
 * the router so dialogs can be opened from anywhere.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
      <ModalRoot />
    </ThemeProvider>
  );
}

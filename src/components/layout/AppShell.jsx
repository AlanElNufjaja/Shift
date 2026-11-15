import Topbar from './Topbar.jsx';

/** Field Shift 3.1: sin sidebar fijo. El recorrido es una tarea por pantalla. */
export default function AppShell({ children }) {
  return <div className="min-h-screen bg-canvas text-forest">
    <a href="#contenido" className="skip-link">Skip to content</a>
    <Topbar />
    <main id="contenido" className="mx-auto w-full max-w-[1150px] space-y-6 px-4 pb-10 pt-6 sm:px-6 sm:pt-9 lg:px-8">
      {children}
    </main>
  </div>;
}

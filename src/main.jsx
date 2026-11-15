import React from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import { FieldProvider } from './context/FieldContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary title="Field Shift encountered an unexpected error.">
      <FieldProvider>
        <App />
      </FieldProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

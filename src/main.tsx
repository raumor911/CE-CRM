import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

const root = createRoot(document.getElementById('root')!);

if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'quotes') {
  // Vista previa de cotizaciones con datos sintéticos: solo en desarrollo, sin login y sin tocar Supabase.
  void import('./preview/QuotesPreview').then(({ QuotesPreview }) => root.render(<StrictMode><QuotesPreview /></StrictMode>));
} else {
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Globally disable mouse wheel / trackpad scroll increment & decrement on number inputs
document.addEventListener(
  'wheel',
  (e) => {
    if (
      (e.target instanceof HTMLInputElement && e.target.type === 'number') ||
      (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'number')
    ) {
      if (e.target instanceof HTMLInputElement) e.target.blur();
      if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
    }
  },
  { capture: true, passive: true }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

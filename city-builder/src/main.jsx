import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { registerServiceWorker } from './install.js';

registerServiceWorker();

createRoot(document.getElementById('root')).render(<App />);

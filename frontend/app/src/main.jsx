import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BottomBar from './components/BottomBar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <BottomBar />
  </StrictMode>,
)

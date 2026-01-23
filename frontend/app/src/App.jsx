import { Routes, Route } from 'react-router-dom'
import './App.css'
import './theme/colors.css'
import DataPage from './pages/DataPage'
import StatusPage from './pages/StatusPage'
import InventoryPage from './pages/InventoryPage'
import BottomBar from './components/BottomBar'

function App() {
  return (
    <div className="app-container">
      <div className="app-width-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DataPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
          </Routes>
        </main>
      </div>
      <BottomBar />
    </div>
  )
}

export default App

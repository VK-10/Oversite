import { Routes, Route } from 'react-router-dom';
import './App.css'
import GlobeView from './pages/GlobeView'
import LandingPage from './pages/LandingPage'

function App() {
  return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/globe" element={<GlobeView />} />
      </Routes>
  )
}

export default App

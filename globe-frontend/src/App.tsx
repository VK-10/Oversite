import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import GlobeView from './pages/GlobeView'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/globe" element={<GlobeView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
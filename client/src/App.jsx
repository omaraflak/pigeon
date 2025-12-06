import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Join from './components/Join';
import Room from './components/Room';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Join />} />
          <Route path="/user/:username/room/:roomId" element={<Room />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

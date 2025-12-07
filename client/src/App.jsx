import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Join from './components/Join';
import Room from './components/Room';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Join />} />
            <Route path="/room/:roomId" element={<Room />} />
          </Routes>
        </main>
        <footer className="footer">
          <a href="https://github.com/omaraflak/pigeon" target="_blank" rel="noopener noreferrer">
            GitHub Repository
          </a>
        </footer>
      </div>
    </Router>
  );
}

export default App;

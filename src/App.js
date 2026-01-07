import { useState, useEffect, useRef } from 'react';

export default function PongGame() {
  const canvasRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  // const [inputUrl, setInputUrl] = useState('ws://localhost:3001');
  const [inputUrl, setInputUrl] = useState('wss://server-pong-render-production.up.railway.app');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');

  const keysPressed = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ligne centrale
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(gameState.paddle1.x, gameState.paddle1.y, gameState.paddle1.width, gameState.paddle1.height);
    ctx.fillRect(gameState.paddle2.x, gameState.paddle2.y, gameState.paddle2.width, gameState.paddle2.height);

    // Balle
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Scores
    ctx.font = 'bold 48px Arial';
    ctx.fillText(gameState.score.player1, canvas.width / 4, 60);
    ctx.fillText(gameState.score.player2, (canvas.width * 3) / 4, 60);

  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysPressed.current[e.key] = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        keysPressed.current[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!ws || !connected) return;

    const interval = setInterval(() => {
      if (keysPressed.current['ArrowUp']) {
        ws.send(JSON.stringify({ type: 'move', direction: 'up' }));
      }
      if (keysPressed.current['ArrowDown']) {
        ws.send(JSON.stringify({ type: 'move', direction: 'down' }));
      }
    }, 16);

    return () => clearInterval(interval);
  }, [ws, connected]);

  const connectToServer = () => {
    setError('');
    try {
      const socket = new WebSocket(inputUrl);

      socket.onopen = () => {
        console.log('Connecté au serveur');
        setConnected(true);
        setServerUrl(inputUrl);
        setWaiting(true);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'role') {
          setPlayerRole(data.role);
          setWaiting(false);
        } else if (data.type === 'waiting') {
          setWaiting(true);
        } else if (data.type === 'gameState') {
          setGameState(data.state);
        } else if (data.type === 'playerLeft') {
          setWaiting(true);
          setError('L\'autre joueur s\'est déconnecté. En attente...');
        }
      };

      socket.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        setError('Erreur de connexion au serveur');
        setConnected(false);
      };

      socket.onclose = () => {
        console.log('Déconnecté du serveur');
        setConnected(false);
        setWaiting(false);
        setPlayerRole(null);
        setError('Connexion fermée');
      };

      setWs(socket);
    } catch (err) {
      setError('URL invalide ou serveur inaccessible');
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setConnected(false);
      setWaiting(false);
      setPlayerRole(null);
      setGameState(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold text-white mb-8">🏓 PONG Multijoueur</h1>

      {!connected ? (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Connexion</h2>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="ws://localhost:3001"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={connectToServer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition"
          >
            Se connecter
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-600 text-white rounded">
              {error}
            </div>
          )}
          <div className="mt-6 text-gray-400 text-sm">
            <p className="font-bold mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Démarrez le serveur Node.js</li>
              <li>Entrez l'URL du serveur WebSocket</li>
              <li>Attendez qu'un autre joueur se connecte</li>
              <li>Utilisez ↑ et ↓ pour jouer</li>
            </ol>
          </div>
        </div>
      ) : waiting ? (
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl text-center">
          <div className="animate-pulse text-yellow-400 text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-2">En attente d'un adversaire...</h2>
          <p className="text-gray-400 mb-6">Partagez l'URL du serveur avec un ami</p>
          <button
            onClick={disconnect}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition"
          >
            Déconnexion
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-white text-xl">
              Vous êtes le <span className="font-bold text-blue-400">Joueur {playerRole === 'player1' ? '1' : '2'}</span>
              <span className="text-gray-400 ml-4">(côté {playerRole === 'player1' ? 'gauche' : 'droit'})</span>
            </p>
          </div>
          
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="border-4 border-white rounded-lg shadow-2xl mb-4"
          />
          
          <div className="flex gap-4 justify-center">
            <div className="bg-gray-800 rounded-lg p-4 text-white">
              <p className="text-sm text-gray-400">Contrôles</p>
              <p className="font-bold">↑ Haut / ↓ Bas</p>
            </div>
            <button
              onClick={disconnect}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition"
            >
              Quitter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
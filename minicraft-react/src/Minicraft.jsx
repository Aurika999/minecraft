import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game.js';
import { Hud, Messages, Debug, MainMenu, PauseMenu, DeathScreen, InventoryScreen } from './ui.jsx';

export default function Minicraft() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [ui, setUi] = useState(null);

  useEffect(() => {
    const game = new Game(mountRef.current, setUi);
    gameRef.current = game;
    return () => { game.dispose(); gameRef.current = null; };
  }, []);

  const game = gameRef.current;
  return (
    <>
      <div ref={mountRef} />
      {ui && game && (
        <>
          {ui.screen === 'play' && <div className="cross" />}
          {ui.screen !== 'menu' && <Hud ui={ui} />}
          {ui.debug && <Debug d={ui.debug} />}
          <Messages messages={ui.messages} />
          {ui.now - ui.hurtAt < 350 && <div className="hurt" />}
          {ui.sleep > 0 && <div className="sleep" style={{ opacity: ui.sleep }} />}
          {ui.screen === 'menu' && <MainMenu game={game} />}
          {ui.screen === 'pause' && <PauseMenu ui={ui} game={game} />}
          {ui.screen === 'dead' && <DeathScreen ui={ui} game={game} />}
          {ui.screen === 'inventory' && <InventoryScreen ui={ui} game={game} />}
        </>
      )}
    </>
  );
}

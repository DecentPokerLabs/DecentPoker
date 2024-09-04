import React, { useState, useEffect } from 'react';
import './Table.css';

const Table = () => {

  return (
  <div id="table">
    <div className="rotate-notice">
      <div>
        <div className="logo">Decent<span className="grey">Poker</span></div>
        <p>Please rotate your device to landscape mode</p>
      </div>
    </div>
    <div className="header pointer" onClick={() => window.location = '/'}>
      <div className="logo">Decent<span className="grey">Poker</span></div>
    </div>
    <div id="table-title">Decent<span className="table-title-alt">Poker</span></div>
    <div id="group-cards"></div>
    <div id="players"></div>
    <div id="pot-chips"></div>
    <div id="pot">
        <div id="pot-text-container"><span id="pot-text" className="green">&ETH;</span><span className="pot-value" id="pot-value">0</span></div>
        <div id="blinds"></div>
        <div id="blind-clock"></div>
    </div>
    <div id="winner" className="hidden"></div>
    <div id="table-notification" className="hidden"></div>
    <div id="action-buttons">
        <div id="action-tier1">
            <div class="percentage-explainer">Standard Raise 25-100% of Pot</div>
            <div onclick="raisePercentage(25);" class="percentage-button standard-button" title="Raise 25% of Pot">25%</div>
            <div onclick="raisePercentage(50);" class="percentage-button standard-button" title="Raise 50% of Pot">50%</div>
            <div onclick="raisePercentage(75);" class="percentage-button standard-button" title="Raise 75% of Pot">75%</div>
            <div onclick="raisePercentage(100);" class="percentage-button standard-button" title="Raise 100% of Pot">100%</div>
        </div>
        <div id="action-tier2">
            <div class="slider-container">
                <div id="slider-value-display" class="hidden"></div>
                <input type="range" min="0" max="1000" value="0" class="slider" id="raise-slider" />
            </div>
        </div>
        <div id="action-tier3">
            <div class="action-button standard-button" id="fold-button"><div class="action-text">FOLD</div></div>
            <div class="action-button standard-button" id="call-button"><div class="action-text">CALL</div></div>
            <div class="action-button standard-button" id="raise-button"><div class="action-text">RAISE</div></div>
        </div>
    </div>
    <div id="checkboxes">
    <div className="checkbox-container">
        <input type="checkbox" id="leave-table-check" name="leave-table-check" className="checkbox" />
        <label htmlFor="leave-table-check" className="checkbox-label">
          Leave Table<span className="checkbox-additional"> - Say goodbye</span>
        </label>
      </div>
      <div className="checkbox-container">
        <input type="checkbox" id="auto-fold" name="auto-fold" className="checkbox" />
        <label htmlFor="auto-fold" className="checkbox-label">
          Auto Fold<span className="checkbox-additional"> - Be right back</span>
        </label>
      </div>
      <div className="checkbox-container">
        <input type="checkbox" id="sit-out" name="sit-out" className="checkbox" />
        <label htmlFor="sit-out" className="checkbox-label">
          Sit Out<span className="checkbox-additional"> - Gone for a beer</span>
        </label>
      </div>
    </div>

    <div id="countdown-timer-container" className="hidden">
        <svg id="countdown-timer" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <g>
                <circle id="timer-animation" r="16" cy="20" cx="20" />
                <circle id="timer-circle" r="12" cx="20" cy="20" />
            </g>
        </svg>
        <div id="countdown-timer-text"></div>
    </div>

    <div id="seat1-player" className="player-container">
        <div id="seat1-cards" className="cards-container">
            <img src="img/cards/Ac.svg" className="card hole-card" />
            <img src="img/cards/Ah.svg" className="card hole-card" />
        </div>
        <img src="img/avatars/player.svg" className="player-frame" id="seat1-frame" />
        <img src="" id="seat1-pic" className="table-pic hidden" />
        <img src="img/avatars/avatar0.svg" id="seat1-avatar" className="player-avatar profile-link" />
        <div id="seat1-stack" className="player-stack"></div>
        <div id="seat1-name" className="player-name">Player 1</div>
        <div id="seat1-timer-container" className="player-timer-container"></div>
        <div id="seat1-status" className="player-status hidden"></div>
        <div id="seat1-bet" className="bet-area"></div>
    </div>

    <div id="seat2-player" className="player-container disabled">
        <div id="seat2-cards" className="cards-container">
            <img src="img/cards/back.svg" className="card opponent-card" />
            <img src="img/cards/back.svg" className="card opponent-card" />
        </div>
        <img src="img/avatars/player.svg" className="player-frame" id="seat2-frame" />
        <img src="img/avatars/avatar0.svg" id="seat2-avatar" className="player-avatar" />
        <div id="seat2-stack" className="player-stack"></div>
        <div id="seat2-name" className="player-name"></div>
        <div id="seat2-timer-container" className="player-timer-container"></div>
        <div id="seat2-status" className="player-status hidden"></div>
        <div id="seat2-bet" className="bet-area"></div>
    </div>

    <div id="seat3-player" className="player-container disabled">
        <div id="seat3-cards" className="cards-container">
            <img src="img/cards/back.svg" className="card opponent-card" />
            <img src="img/cards/back.svg" className="card opponent-card" />
        </div>
        <img src="img/avatars/player.svg" className="player-frame" id="seat3-frame" />
        <img src="" id="seat3-pic" className="table-pic hidden" />
        <img src="img/avatars/avatar0.svg" id="seat3-avatar" className="player-avatar" />
        <div id="seat3-stack" className="player-stack"></div>
        <div id="seat3-name" className="player-name"></div>
        <div id="seat3-timer-container" className="player-timer-container"></div>
        <div id="seat3-status" className="player-status hidden"></div>
        <div id="seat3-bet" className="bet-area"></div>
    </div>
    <div id="seat4-player" className="player-container disabled">
        <div id="seat4-cards" className="cards-container">
            <img src="img/cards/back.svg" className="card opponent-card" />
            <img src="img/cards/back.svg" className="card opponent-card" />
        </div>
        <img src="img/avatars/player.svg" className="player-frame" id="seat4-frame" />
        <img src="" id="seat4-pic" className="table-pic hidden" />
        <img src="img/avatars/avatar0.svg" id="seat4-avatar" className="player-avatar" />
        <div id="seat4-stack" className="player-stack"></div>
        <div id="seat4-name" className="player-name">Player 2</div>
        <div id="seat4-timer-container" className="player-timer-container"></div>
        <div id="seat4-status" className="player-status hidden"></div>
        <div id="seat4-bet" className="bet-area"></div>

    </div>
    <div id="seat5-player" className="player-container disabled">
        <div id="seat5-cards" className="cards-container">
            <img src="img/cards/back.svg" className="card opponent-card" />
            <img src="img/cards/back.svg" className="card opponent-card" />
        </div>
        <img src="img/avatars/player.svg" className="player-frame" id="seat5-frame" />
        <img src="" id="seat5-pic" className="table-pic hidden" />
        <img src="img/avatars/avatar0.svg" id="seat5-avatar" className="player-avatar" />
        <div id="seat5-stack" className="player-stack"></div>
        <div id="seat5-name" className="player-name"></div>
        <div id="seat5-timer-container" className="player-timer-container"></div>
        <div id="seat5-status" className="player-status hidden"></div>
        <div id="seat5-bet" className="bet-area"></div>
    </div>
    <div id="seat6-player" className="player-container disabled">
        <div id="seat6-cards" className="cards-container">
            <img src="img/cards/back.svg" className="card opponent-card" />
            <img src="img/cards/back.svg" className="card opponent-card" />	
        </div>
        <img src="img/avatars/player.svg" className="player-frame" id="seat6-frame" />
        <img src="" id="seat6-pic" className="table-pic hidden" />
        <img src="img/avatars/avatar0.svg" id="seat6-avatar" className="player-avatar" />
        <div id="seat6-stack" className="player-stack"></div>
        <div id="seat6-name" className="player-name"></div>
        <div id="seat6-timer-container" className="player-timer-container"></div>
        <div id="seat6-status" className="player-status hidden"></div>
        <div id="seat6-bet" className="bet-area"></div>
    </div>

  </div>
  );
}

export default Table;
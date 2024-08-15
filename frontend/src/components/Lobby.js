import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { ethers } from 'ethers';
import { pokerLobbyAddress, pokerLobbyABI, pokerChipsAddress, pokerChipsABI } from './Contracts';
import { Download, Upload, Copy, Wallet, Trash2, SquareMousePointer, RefreshCw, Coins, Users, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2'
import 'react-tabs/style/react-tabs.css';
import './Lobby.css';

let provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

const copyToClipBoard = async (containerid) => {
  let range;
  if (document.selection) { 
    range = document.body.createTextRange();
    range.moveToElementText(document.getElementById(containerid));
    range.select().createTextRange();
    document.execCommand("Copy"); 
  } else if (window.getSelection) {
    range = document.createRange();
    range.selectNode(document.getElementById(containerid));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("Copy");
  }
}

const Lobby = () => {
  const [wallet, setWallet] = useState(null);

  const backupWallet = async () => {
    const virtualWallet = await loadWallet();
    prompt("Your Private Key", virtualWallet.privateKey);
  }

  const restoreWallet = async () => {
    if (await Swal.fire({ title: 'Restore Wallet?', text: "Make sure you have backed up your current wallet if it has any funds in it", icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then(result => result.isConfirmed)) {
      const pk = prompt('Enter a private key');
      if (pk == '') return;
      const tmpWallet = new ethers.Wallet(pk);
      const newWallet = { name: `Imported Wallet`, privateKey: tmpWallet.privateKey, address: tmpWallet.address, type: 'virtual' }
      localStorage.setItem('wallet', JSON.stringify(newWallet));
      setWallet(JSON.stringify(newWallet));
    }
  }

  const resetWallet = async () => {
    if (await Swal.fire({ title: 'Reset Wallet?', text: "Make sure you have backed up your current wallet if it has any funds in it", icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then(result => result.isConfirmed)) {
      const tmpWallet = ethers.Wallet.createRandom();
      const newWallet = { name: `New Wallet`, privateKey: tmpWallet.privateKey, address: tmpWallet.address, type: 'virtual' }
      localStorage.setItem('wallet', JSON.stringify(newWallet));
      setWallet(JSON.stringify(newWallet));
    }
  }

  const initAccount = async () => {
    const tmpWallet = ethers.Wallet.createRandom();
    const walletAddress = await tmpWallet.getAddress();
    const newWallet = { name: `Virtual Wallet 1`, privateKey: tmpWallet.privateKey, address: walletAddress, type: 'virtual' }
    const walletJSON = JSON.stringify(newWallet);
    localStorage.setItem('wallet', walletJSON);
    setWallet(walletJSON);
  }

  const loadWallet = async () => {
    let walletJSON = localStorage.getItem('wallet');
    if (walletJSON === null) {
      await initAccount();
      walletJSON = localStorage.getItem('wallet');
    }
    const wallet = JSON.parse(walletJSON);
    let virtualWallet;
    if (wallet.type === 'browser') {
      provider = new ethers.BrowserProvider(window.ethereum)
      virtualWallet = await provider.getSigner();
    } else {
      const loadedWallet = new ethers.Wallet(wallet.privateKey);
      virtualWallet = loadedWallet.connect(provider);
    }
    return virtualWallet;
  }

  const connectWallet = async () => {
    if (await Swal.fire({ title: 'Are you sure?', text: "This will overwrite your virtual wallet and you'll need to confirm each transaction in metamask", icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes Connect' }).then(result => result.isConfirmed)) {
      provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      if (network.chainId !== 84532n) alert('Please set your network to Base Sepolia Testnet or visit Chainlist.org');
      const newWallet = { name: `Browser Wallet`, privateKey: null, address: signer.address, type: 'browser' }
      localStorage.setItem('wallet', JSON.stringify(newWallet));
        
      window.ethereum.on('accountsChanged', () => { connectWallet() });
      window.ethereum.on('network', () => { connectWallet() });
      setWallet(JSON.stringify(newWallet));
    }
  }
  
  const getWallet = () => {
    let walletJSON = localStorage.getItem('wallet');
    if (walletJSON === null) return 'Loading...';
    return JSON.parse(walletJSON);
  }

  const updateBalances = async () => {
    console.log('Updating balances...')
    let el = document.getElementById('eth-balance');
    if (el) {
      const myWallet = getWallet();
      let balance = await provider.getBalance(myWallet.address);
      el.innerHTML = ethers.formatEther(balance);
      el = document.getElementById('pokerchips-balance');
      const pokerChips = new ethers.Contract(pokerChipsAddress, pokerChipsABI, provider);
      balance = await pokerChips.balanceOf(myWallet.address);
      el.innerHTML = ethers.formatUnits(balance, 6);
    }
  }

  const loadGame = async () => {
    alert('coming soon');
  }

  useEffect(() => {
    updateBalances();
  }, []);

  return (
  <div className="content">
    <div className="rotate-notice">
      <div>
        <div className="logo">Decent<span className="grey">Poker</span></div>
        <p>Please rotate your device to landscape mode</p>
      </div>
    </div>
    <div className="header pointer" onClick={() => window.location = '/'}>
      <div className="logo">Decent<span className="grey">Poker</span></div>
    </div>
    <h1>Welcome To The Lobby</h1>
    <Tabs>
      <TabList>
        <Tab>Cash Games</Tab>
        <Tab>Sit &amp; Go</Tab>
        <Tab>Wallet Management</Tab>
      </TabList>

      <TabPanel>
        <div className="flex-row flex-middle flex-center">
          <div className="flex-item game-card pointer" onClick={() => loadGame()}>
            <div className="purple bold text-big">No Limit Hold'em</div>
            <img src="/img/game-card.webp" alt="Game Card" />
            <div><Users size={12} className="green" /> Players 3/6</div>
            <div><Coins size={12} className="green" /> Blinds 1/2 PKR</div>
            <div><DollarSign size={12} className="green" /> Buy In 200 PKR</div>
            <button>JOIN GAME</button>
          </div>
          <div className="flex-item game-card pointer" onClick={() => loadGame()}>
            <div className="purple bold text-big">No Limit Hold'em</div>
            <img src="/img/game-card.webp" alt="Game Card" />
            <div><Users size={12} className="green" /> Players 2/9</div>
            <div><Coins size={12} className="green" /> Blinds 10/20 PKR</div>
            <div><DollarSign size={12} className="green" /> Buy In 2000 PKR</div>
            <button>JOIN GAME</button>
          </div>
        </div>
      </TabPanel>
      <TabPanel>
      <div className="flex-row flex-middle flex-center">
          <div className="flex-item game-card pointer" onClick={() => loadGame()}>
            <div className="purple bold text-big">No Limit Hold'em</div>
            <img src="/img/game-card.webp" alt="Game Card" />
            <div><Users size={12} className="green" /> Players 5/6</div>
            <div><Coins size={12} className="green" /> Turbo SnG</div>
            <div><DollarSign size={12} className="green" /> Buy In 100 PKR</div>
            <button>JOIN GAME</button>
          </div>
          <div className="flex-item game-card pointer" onClick={() => loadGame()}>
            <div className="purple bold text-big">No Limit Hold'em</div>
            <img src="/img/game-card.webp" alt="Game Card" />
            <div><Users size={12} className="green" /> Players 7/9</div>
            <div><Coins size={12} className="green" /> Deep Stack SnG</div>
            <div><DollarSign size={12} className="green" /> Buy In 500 PKR</div>
            <button>JOIN GAME</button>
          </div>
          <div className="flex-item game-card pointer" onClick={() => loadGame()}>
            <div className="purple bold text-big">No Limit Hold'em</div>
            <img src="/img/game-card.webp" alt="Game Card" />
            <div><Users size={12} className="green" /> Players 1/9</div>
            <div><Coins size={12} className="green" /> Turbo SnG</div>
            <div><DollarSign size={12} className="green" /> Buy In 100 PKR</div>
            <button>JOIN GAME</button>
          </div>
        </div>
      </TabPanel>
      <TabPanel>
        <div>
          <div className="text-big green">DecentPoker is best played with a locally stored virtual wallet</div>
          <p>Please note that DecentPoker is currently deployed to Base Sepolia testnet.</p>
          <p>You will need some testnet ETH to pay transaction fees in your wallet.</p>
        </div>
        <div className="flex-row flex-middle wallet-container">
          <div className="flex-item">
            <div id="wallet-name" className="text-big"><Wallet size={12} /> {getWallet().name}</div>
          </div>
          <div className="flex-item flex-grow">
            <div className="text-big green">Connected</div>
            <div className="text-small grey">{getWallet().type}</div>
          </div>
          <div className="flex-row flex-middle flex-center pointer" onClick={() => copyToClipBoard('wallet-address')}>
            <span id="wallet-address" className="text-small purple">{getWallet().address}</span>
            &nbsp; <Copy className="green" size={12} />
          </div>
        </div>
        <RefreshCw id="refresh-balances" className="green pointer" size={16} onClick={() => updateBalances()} />
        <table className="asset-table">
          <thead>
            <tr>
              <th>ASSET</th>
              <th>BALANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ETH</td>
              <td><span className="green" id="eth-balance"></span> <span className="text-small grey">ETH</span></td>
            </tr>
            <tr>
              <td>PokerChips</td>
              <td><span className="green" id="pokerchips-balance"></span> <span className="text-small grey">PKR</span></td>
            </tr>
          </tbody>
        </table>

        <div className="flex-row flex-center">
          <button className="flex-item" onClick={() => backupWallet()}><Download size={12} /> BACKUP</button>
          <button className="flex-item" onClick={() => restoreWallet()}><Upload size={12} /> RESTORE</button>
          <button className="flex-item" onClick={() => resetWallet()}><Trash2 size={12} /> RESET</button>
        </div>
        <div className="spacer"></div>
        <div className="flex-row flex-center">
          <button className="flex-item" onClick={() => connectWallet()}><SquareMousePointer size={12} /> CONNECT METAMASK</button>
        </div>
        <div id="wallet-assets" className="flex-column"></div>
      </TabPanel>
    </Tabs>
  </div>
  );
}

export default Lobby;
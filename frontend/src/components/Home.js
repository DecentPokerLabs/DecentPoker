import React, { useEffect } from 'react';
import './Home.css';
import { ReactComponent as PokerIcon } from '../img/icons/poker.svg';
import { ReactComponent as CubeIcon } from '../img/icons/cube.svg';
import { ReactComponent as RakeIcon } from '../img/icons/coins.svg';

const Home = () => {
  useEffect(() => {
    // Attach event listeners
    document.querySelectorAll('.play-now').forEach(element => {
      element.addEventListener('click', () => {
        alert('Coming Soon!');
      });
    });
    document.querySelectorAll('.read-docs').forEach(element => {
      element.addEventListener('click', () => {
        window.location.href = 'https://decentpoker.org/DecentPoker-Whitepaper.pdf';
      });
    });

    // Cleanup event listeners on component unmount
    return () => {
      document.querySelectorAll('.play-now').forEach(element => {
        element.removeEventListener('click', () => {
          alert('Coming Soon!');
        });
      });
      document.querySelectorAll('.read-docs').forEach(element => {
        element.removeEventListener('click', () => {
          window.location.href = 'https://decentpoker.org/DecentPoker-Whitepaper.pdf';
        });
      });
    };
  }, []);


  return (
    <div className="content">
        <div className="rotate-notice">
            <div>
                <div className="logo">Decent<span className="grey">Poker</span></div>
                <p>Please rotate your device to landscape mode</p>
            </div>
        </div>
        <div className="menu">
            <a href="javscript:void(0)" className="play-now">PLAY</a> <span className="grey">|</span>
            <a href="https://decentpoker.substack.com">NEWS</a> <span className="grey">|</span>
            <a href="https://decentpoker.org/DecentPoker-Whitepaper.pdf">WHITEPAPER</a> <span className="grey">|</span>
            <a href="https://github.com/DecentPokerLabs/DecentPoker">GITHUB</a> <span className="grey">|</span>
            <a href="https://x.com/DecentPokerLabs">@DECENTPOKERLABS</a> <span className="grey">|</span>
            <a href="mailto:decentpokerlabs@proton.me">CONTACT</a>
        </div>

        <header className="hero">
            <div className="logo">Decent<span className="grey">Poker</span></div>
            <h1>The Open Decentralized Poker Project</h1>
            <p>Rake Free Texas Hold'em</p>
            <button className="play-now">PLAY NOW</button>
            <p className="no-sign-up">No Sign Up Required</p>
        </header>

        <section id="how-it-works" className="container">
            <h2>How It Works</h2>
            <p>Decentralization, a fancy term which just means you are playing on a shared global computer</p>
            <p>There is no online casino, no one to charge you fees, no one to misuse your personal data</p>
            <p>You play against other players who connect to the peer to peer network like you</p>
            <div className="grid">
                <div className="grid-item">
                    <PokerIcon className="svg-icon" alt="Permissionless Poker" />
                    <div className="grid-text">
                        <h3>Permissionless Poker</h3>
                        <p>First fully decentralized poker game with no third party dealer</p>
                        <p>Decent poker is a peer to peer trustless game. This web page is hosted on Github and the backend runs on a shared Ethereum virtual machine decentralized network</p>
                    </div>
                </div>
                <div className="grid-item">
                    <div className="grid-text">
                        <h3>Community Built</h3>
                        <p>Built by poker players for poker players and shared with the community</p>
                        <p>The full code base is open source for transparency. Don't trust, verify you are playing a fair game</p>
                    </div>
                    <CubeIcon className="svg-icon" alt="Community Built" />
                    
                </div>
                <div className="grid-item">
                    <RakeIcon className="svg-icon" alt="Rake Free" />
                    <div className="grid-text">
                        <h3>Rake Free</h3>
                        <p>Rake free gameplay allowing players to keep 100% of their winnings</p>
                        <p>Legacy poker sites charge up to 5% rake on every hand. DecentPoker is rake free, with no fees, no hidden charges</p>
                    </div>
                </div>
            </div>
            <button className="read-docs">DOCUMENTATION</button> <button className="play-now">PLAY NOW</button>
        </section>

        <section id="game-features" className="container">
            <h2>Get Started - Easy Onboarding</h2>
            <div className="features">
                <div className="feature">
                    <h3>Get Some Crypto</h3>
                    <p>Get some USDC on <a href="https://coinbase.com" target="_blank">Coinbase</a> and fund your account. Withdraw funds at any time. Maintain complete control over your digital wallet.</p>
                </div>
                <div className="feature">
                    <h3>Join Your Game</h3>
                    <p>Join a game from the lobby at stakes you are comfortable playing or create your own private home game and invite friends.</p>
                </div>
            </div>
        </section>

        <section id="testimonials" className="container">
            <h2>Be Part Of</h2>
            <p>The worlds first fully decentralized peer to peer poker community.</p>
            <div className="testimonials grid">
                <div className="testimonial grid-item">
                    <img src="img/testimonial1.webp" alt="Testimonial" />
                    <p>"DecentPoker has completely revolutionized how we think about poker. The house always wins, except when there is no house. It's the only choice for any serious player"</p>
                </div>
                <div className="testimonial grid-item">
                    <p>"Joining the community has been fantastic, providing both security and a social, engaging environment. I highly recommend it to anyone looking for an exciting poker experience"</p>
                    <img src="img/testimonial2.webp" alt="Testimonial" />
                </div>
            </div>
            <button className="play-now">JOIN IN TODAY</button>
            <p>⭐⭐⭐⭐⭐</p>
        </section>

        <section id="security-fairness" className="container">
            <h2>Security and Fairness</h2>
            <h4>Ensuring a Secure and Trustworthy Poker Experience</h4>
            <p>At DecentPoker, security and fairness are our top priorities. We understand the importance of creating a safe and reliable environment for our players, and we are committed to delivering a platform that you can trust.</p>
        
            <div className="security-item">
                <h4>Decentralized Architecture</h4>
                <p>Our game is built on a fully decentralized architecture. Unlike traditional online poker platforms that rely on centralized servers, DecentPoker leverages blockchain technology to ensure that no single party has control over the game. This eliminates the risk of central points of failure and enhances the overall security of our platform.</p>
            </div>
        
            <div className="security-item">
                <h4>Transparent and Verifiable Smart Contracts</h4>
                <p>All game logic and transactions are handled by smart contracts, which are transparent and open-source. These contracts have been rigorously tested through extensive unit and integration tests to ensure their reliability and security. You can review our smart contracts and unit tests on our <a href="https://github.com/DecentPokerLabs/DecentPoker/" target="_blank">GitHub repository</a>. By making our code open-source, we invite the community to verify and audit our contracts, fostering trust and transparency.</p>
            </div>
        
            <div className="security-item">
                <h4>Trustless Card Dealing</h4>
                <p>One of the key innovations of DecentPoker is our trustless card dealing mechanism. Traditional online poker platforms rely on a centralized dealer, which can be a point of manipulation and unfair play. At DecentPoker, cards are dealt using cryptographic commitments and blockhashes, ensuring randomness and fairness without the need for a third-party dealer. Each player deals from their own deck, and shared community cards are generated in a verifiable and tamper-proof manner.</p>
            </div>

            <h4>Join Us in Creating a Fair Poker Ecosystem</h4>
            <p>DecentPoker is dedicated to revolutionizing the online poker landscape by prioritizing security and fairness. We believe that a transparent, decentralized, and community-driven approach is the key to building a trustworthy platform. Join us on this journey and experience poker the way it was meant to be played.</p>
            <button className="play-now">PLAY NOW</button>
        </section>
        

        <section id="blog-news" className="container">
            <h2>Newsletter</h2>
            <p>Stay updated with the latest features, events, and company news.</p>
            <iframe src="https://decentpoker.substack.com/embed" width="480" height="320" id="substack-iframe"></iframe>              
            <p>Read educational content about poker strategies, blockchain technology, and decentralized gaming.</p>
            <a href="https://decentpoker.substack.com" target="_blank">https://decentpoker.substack.com</a>
        </section>

        <footer className="container">
            <a href="https://decentpoker.substack.com">News</a> <span className="grey">|</span>
            <a href="https://decentpoker.org/learn">How To Play</a> <span className="grey">|</span>
            <a href="https://github.com/DecentPokerLabs/DecentPoker">Github</a> <span className="grey">|</span>
            <a href="https://decentpoker.org/DecentPoker-Whitepaper.pdf">Whitepaper</a> <span className="grey">|</span>
            <a href="https://github.com/DecentPokerLabs/DecentPoker">Docs</a> <span className="grey">|</span>
            <a href="https://x.com/DecentPokerLabs">@DecentPokerLabs</a> <span className="grey">|</span>
            <a href="mailto:decentpokerlabs@proton.me">Contact</a> <span className="grey">|</span>
            <a href="https://decentpoker.org/DecentPoker-Legal.pdf">Legal</a>
            <p>DecentPoker is a community built project,<a href="https://github.com/DecentPokerLabs/DecentPoker">get involved?</a></p>
            <p>∞</p>
        </footer>
    </div>
  );
  document.querySelectorAll('.play-now').forEach(element => {
      element.addEventListener('click', () => {
          alert('Coming Soon!');
      });
  });
  document.querySelectorAll('.read-docs').forEach(element => {
      element.addEventListener('click', () => {
          window.location.href = 'https://decentpoker.org/DecentPoker-Whitepaper.pdf';
      });
  });
}

export default Home;
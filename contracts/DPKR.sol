// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DPKR Token
 * @author decentpokerlabs@proton.me
 * @notice The DecentPoker Token
 *   ____                      _   ____       _             
 *  |  _ \  ___  ___ ___ _ __ | |_|  _ \ ___ | | _____ _ __ 
 *  | | | |/ _ \/ __/ _ \ '_ \| __| |_| / _ \| |/ / _ \  __|
 *  | |_| |  __/ |_|  __/ | | | |_|  __/ |_| |   <  __/ |   
 *  |____/ \___|\___\___|_| |_|\__|_|   \___/|_|\_\___|_|   
 *                                                          
 *       The Open Decentralized Poker Project               
 *            https://decentpoker.org                       
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DecentPoker is ERC20 {

    address public team;
    uint public deployed;
    uint public vestingPeriod;
    uint public communityMinted;
    uint public partnersMinted;
    uint public startDate;
    uint public endDate;
    uint public startPricePerToken = 40000; // $0.04e6
    uint public endPricePerToken = 60000; // $0.06e6
    uint public saleMinted;
    bool public tokenLive;
    IERC20 public usdcToken;

    event TokenSale(address to, uint amount, uint usdcContributed);

    constructor(address _usdcToken) ERC20("DecentPoker", "DPKR") {
        team = msg.sender;
        deployed = block.timestamp;
        vestingPeriod = deployed + 1460 days;
        startDate = deployed + 7 days;
        endDate = deployed + 37 days;
        usdcToken = IERC20(_usdcToken);
        tokenLive = true; // enable minting
        _mint(team, 5_000_000 * 10 ** decimals());
        _mint(team, 20_000_000 * 10 ** decimals()); // Liquidity Provision
        tokenLive = false; // enable minting
    }

    function mintCommunity(address _to, uint _amount) public {
        require(msg.sender == team, "Only team multisig can mint");
        uint mintLimit = 5_000_000 * 10 ** decimals();
        require(communityMinted + _amount <= mintLimit, "exceeds mint limit");
        communityMinted += _amount;
        bool tokenState = tokenLive;
        tokenLive = true;
        _mint(_to, _amount);
        tokenLive = tokenState;
    }

    function mintPartners(address _to, uint _amount) public {
        require(msg.sender == team, "Only team multisig can mint");
        uint mintLimit = 15_000_000 * 10 ** decimals();
        require(partnersMinted + _amount <= mintLimit, "exceeds mint limit");
        partnersMinted += _amount;
        bool tokenState = tokenLive;
        tokenLive = true;
        _mint(_to, _amount);
        tokenLive = tokenState;
    }

    function unlockTeamTokens() public {
        require(msg.sender == team, "Only team multisig can mint");
        require (block.timestamp > deployed + 1095 days, "too early");
        _mint(msg.sender, 15_000_000 * 10 ** decimals());
    }

    function unlockPrivateSale() public {
        require (block.timestamp > deployed + 365 days, "too early");
        _mint(msg.sender, 20_000_000 * 10 ** decimals()); // Can change to VC addresses
    }

    function unlockLiquidityProvision() public {
        require(msg.sender == team, "Only team multisig can mint");
        require (block.timestamp > deployed + 37 days, "too early");
        _mint(msg.sender, 20_000_000 * 10 ** decimals());
    }

    function pricePerDay(uint _day) public view returns (uint) {
        uint startDay = 0;
        uint endDay = (endDate - startDate) / 1 days;
        uint timeProgress = _day - startDay;
        uint totalDuration = endDay - startDay;
        uint priceProgress = ((endPricePerToken - startPricePerToken) * timeProgress) / totalDuration;
        uint currentPrice = startPricePerToken + priceProgress;
        return currentPrice;
    }

    function staggeredPrice() public view returns (uint) {
        uint daysPassed = (block.timestamp - startDate) / 1 days;
        uint currentPrice = pricePerDay(daysPassed);
        return currentPrice;
    }

    function nextPriceUpdate() external view returns (uint, uint) {
        uint daysPassed = (block.timestamp - startDate) / 1 days;
        uint nextUpdateTS = startDate + ((daysPassed + 1) * 1 days);
        uint secondsLeft = nextUpdateTS - block.timestamp;
        uint nextPrice = pricePerDay(daysPassed + 1);
        return (secondsLeft, nextPrice);
    }

    function buyTokens(uint _amountUSDC) external {
        uint tokenSaleLimit = 20_000_000 * 10 ** decimals();
        require(block.timestamp > startDate, "too soon");
        require(block.timestamp < endDate, "too late");
        require(_amountUSDC > 100e6, "min amount in not met");
        uint _price = staggeredPrice();
        uint _amount = (_amountUSDC * 10 ** decimals()) / _price;
        require(_amount > 0, "min amount out not met");
        require(saleMinted + _amount < tokenSaleLimit, "sold out");
        saleMinted += _amount;
        usdcToken.transferFrom(msg.sender, team, _amountUSDC); 
        tokenLive = true;
        _mint(msg.sender, _amount);
        tokenLive = false;
        emit TokenSale(msg.sender, _amount, _amountUSDC);
    }

    function goLive() external {
        require(msg.sender == team, "Only team can go live");
        tokenLive = true;
    }

    function _update(address from, address to, uint256 value) internal override(ERC20) {
        require(tokenLive == true, "Token transfers not enabled yet");
        super._update(from, to, value);
    }

}

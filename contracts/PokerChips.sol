// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PokerChips
 * @author decentpokerlabs@proton.me
 * @notice The chips used in poker games
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

contract PokerChips is ERC20 {
    IERC20 public usdcToken;

    constructor(address _usdcToken) ERC20("PokerChips", "PKR") {
        usdcToken = IERC20(_usdcToken);
    }

    function depositUSDC(uint256 amount) external {
        require(usdcToken.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        _mint(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient PokerChips balance");
        _burn(msg.sender, amount);
        require(usdcToken.transfer(msg.sender, amount), "USDC transfer failed");
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}

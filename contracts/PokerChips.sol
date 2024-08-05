// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PokerChips
 * @author decentpokerlabs@proton.me
 * @notice Play money chips for poker games
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

    constructor() ERC20("PokerChips", "PKR") {}

    function mint(uint256 _amount) external {
        require (_amount < 1_000_000e6, "Cant mint more than one mil");
        _mint(msg.sender, _amount); // Anyone can mint
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}

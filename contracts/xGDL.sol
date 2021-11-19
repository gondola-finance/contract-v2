// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// This contract handles swapping to and from xGDL, Gondola's staking token.
contract XGDL is ERC20("xGDL", "xGDL"), Ownable {
    using SafeMath for uint256;
    IERC20 public gdl;

    // Maximum basis points
    uint256 public constant MAX_BP = 10000;
    uint256 public constant MAX_WITHDRAWAL_FEE = 1000;
    uint256 public withdrawalFee;

    // Define the Gondola token contract
    constructor(IERC20 _gdl, uint256 _withdrawalFee) public {
        gdl = _gdl;
        withdrawalFee = _withdrawalFee;
    }

    function getRatio(uint256 _share) external view returns (uint256) {
        // Gets the amount of xGDL in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of GDL the xGDL is worth
        if (totalShares == 0) {
            return 0;
        }
        uint256 what =
            _share.mul(gdl.balanceOf(address(this))).div(totalShares);
        return what;
    }

    // Enter the xGDL. Pay some xGDLs. Earn some shares.
    // Locks GDL and mints xGDL
    function enter(uint256 _amount) public {
        // Gets the amount of GDL locked in the contract
        uint256 totalGDL = gdl.balanceOf(address(this));
        // Gets the amount of xGDL in existence
        uint256 totalShares = totalSupply();
        // If no xGDL exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalGDL == 0) {
            _mint(msg.sender, _amount);
        }
        // Calculate and mint the amount of xGDL the GDL is worth. The ratio will change overtime, as xGDL is burned/minted and GDL deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount.mul(totalShares).div(totalGDL);
            _mint(msg.sender, what);
        }
        // Lock the GDL in the contract
        gdl.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the bar. Claim back your GDLs.
    // Unlocks the staked + gained GDL and burns xGDL
    function leave(uint256 _share) public {
        // Gets the amount of xGDL in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of GDL the xGDL is worth
        uint256 what =
            _share.mul(gdl.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        uint256 fee = what.mul(withdrawalFee).div(MAX_BP);
        uint256 toSend = what.sub(fee);
        gdl.transfer(msg.sender, toSend);
    }

    function setWithdrawFee(uint256 _withdrawalFee) external onlyOwner {
        require(
            _withdrawalFee <= MAX_WITHDRAWAL_FEE,
            "Can't have withdraw fee greater than maximum"
        );
        withdrawalFee = _withdrawalFee;
    }
}

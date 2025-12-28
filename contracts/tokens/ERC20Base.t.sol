// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SimpleToken.sol";

/**
 * @title ERC20BaseTest
 * @notice Solidity tests for ERC20Base functionality
 * @dev Uses Hardhat v3 native Solidity testing
 *
 * Test conventions:
 * - test_* functions are run as tests
 * - setUp() is called before each test
 * - Use require() for assertions
 */
contract ERC20BaseTest {
    SimpleToken token;
    address owner;
    address user1;
    address user2;

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        token = new SimpleToken("Test Token", "TEST", INITIAL_SUPPLY);
    }

    // ============ Deployment Tests ============

    function test_DeploymentSetsName() public view {
        require(
            keccak256(bytes(token.name())) == keccak256(bytes("Test Token")),
            "Name should be 'Test Token'"
        );
    }

    function test_DeploymentSetsSymbol() public view {
        require(
            keccak256(bytes(token.symbol())) == keccak256(bytes("TEST")),
            "Symbol should be 'TEST'"
        );
    }

    function test_DeploymentSetsDecimals() public view {
        require(token.decimals() == 18, "Decimals should be 18");
    }

    function test_DeploymentMintsTotalSupply() public view {
        require(token.totalSupply() == INITIAL_SUPPLY, "Total supply mismatch");
    }

    function test_DeploymentMintsToDeployer() public view {
        require(token.balanceOf(owner) == INITIAL_SUPPLY, "Deployer balance mismatch");
    }

    // ============ Transfer Tests ============

    function test_TransferMovesTokens() public {
        uint256 amount = 100 ether;
        token.transfer(user1, amount);

        require(token.balanceOf(user1) == amount, "User1 should receive tokens");
        require(token.balanceOf(owner) == INITIAL_SUPPLY - amount, "Owner balance incorrect");
    }

    function test_TransferReturnsTrue() public {
        bool success = token.transfer(user1, 100 ether);
        require(success, "Transfer should return true");
    }

    function test_TransferFailsWithInsufficientBalance() public {
        token.transfer(user1, INITIAL_SUPPLY);

        try token.transfer(user2, 1 ether) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("ERC20: insufficient balance")),
                "Wrong error"
            );
        }
    }

    // ============ Approve Tests ============

    function test_ApproveSetsAllowance() public {
        token.approve(user1, 100 ether);
        require(token.allowance(owner, user1) == 100 ether, "Allowance mismatch");
    }

    function test_ApproveReturnsTrue() public {
        bool success = token.approve(user1, 100 ether);
        require(success, "Approve should return true");
    }

    // ============ TransferFrom Tests ============

    function test_TransferFromMovesTokens() public {
        token.approve(address(this), 100 ether);
        token.transferFrom(owner, user1, 100 ether);
        require(token.balanceOf(user1) == 100 ether, "User1 should receive tokens");
    }

    function test_TransferFromReducesAllowance() public {
        token.approve(address(this), 100 ether);
        token.transferFrom(owner, user1, 40 ether);
        require(token.allowance(owner, address(this)) == 60 ether, "Allowance should decrease");
    }

    // ============ Fuzz Test ============

    function test_TransferAnyAmount(uint256 amount) public {
        if (amount > INITIAL_SUPPLY) amount = INITIAL_SUPPLY;
        if (amount == 0) amount = 1;

        token.transfer(user1, amount);
        require(token.balanceOf(user1) == amount, "Transfer amount mismatch");
    }
}

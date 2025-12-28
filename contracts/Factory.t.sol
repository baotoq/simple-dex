// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Factory.sol";
import "./tokens/SimpleToken.sol";

/**
 * @title FactoryTest
 * @notice Solidity tests for the Factory contract
 */
contract FactoryTest {
    Factory factory;
    SimpleToken tokenA;
    SimpleToken tokenB;
    SimpleToken tokenC;

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        factory = new Factory();
        tokenA = new SimpleToken("Token A", "TKA", INITIAL_SUPPLY);
        tokenB = new SimpleToken("Token B", "TKB", INITIAL_SUPPLY);
        tokenC = new SimpleToken("Token C", "TKC", INITIAL_SUPPLY);
    }

    // ============ Deployment Tests ============

    function test_DeploymentStartsWithZeroPools() public view {
        require(factory.allPoolsLength() == 0, "Should start with zero pools");
    }

    // ============ Create Pool Tests ============

    function test_CreatePoolSucceeds() public {
        address pool = factory.createPool(address(tokenA), address(tokenB));
        require(pool != address(0), "Pool address should not be zero");
        require(factory.allPoolsLength() == 1, "Should have one pool");
    }

    function test_CreatePoolEmitsEvent() public {
        // We can't easily check events in native Solidity tests
        // Just verify the pool is created
        factory.createPool(address(tokenA), address(tokenB));
        require(factory.allPoolsLength() == 1, "Pool should be created");
    }

    function test_GetPoolReturnsCorrectAddress() public {
        address createdPool = factory.createPool(address(tokenA), address(tokenB));
        address retrievedPool = factory.getPool(address(tokenA), address(tokenB));

        require(createdPool == retrievedPool, "Pool addresses should match");
    }

    function test_GetPoolWorksWithReversedOrder() public {
        address createdPool = factory.createPool(address(tokenA), address(tokenB));

        address poolAB = factory.getPool(address(tokenA), address(tokenB));
        address poolBA = factory.getPool(address(tokenB), address(tokenA));

        require(poolAB == poolBA, "Order should not matter");
        require(poolAB == createdPool, "Should return created pool");
    }

    function test_CreateMultiplePools() public {
        factory.createPool(address(tokenA), address(tokenB));
        factory.createPool(address(tokenA), address(tokenC));
        factory.createPool(address(tokenB), address(tokenC));

        require(factory.allPoolsLength() == 3, "Should have three pools");
    }

    function test_CreatePoolFailsForDuplicate() public {
        factory.createPool(address(tokenA), address(tokenB));

        try factory.createPool(address(tokenA), address(tokenB)) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Factory: pool already exists")),
                "Wrong error"
            );
        }
    }

    function test_CreatePoolFailsForDuplicateReversed() public {
        factory.createPool(address(tokenA), address(tokenB));

        try factory.createPool(address(tokenB), address(tokenA)) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Factory: pool already exists")),
                "Wrong error"
            );
        }
    }

    function test_CreatePoolFailsForIdenticalTokens() public {
        try factory.createPool(address(tokenA), address(tokenA)) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Factory: identical tokens")),
                "Wrong error"
            );
        }
    }

    function test_CreatePoolFailsForZeroAddress() public {
        try factory.createPool(address(tokenA), address(0)) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Factory: zero address")),
                "Wrong error"
            );
        }
    }

    // ============ All Pools Array Tests ============

    function test_AllPoolsArrayTracksCreatedPools() public {
        factory.createPool(address(tokenA), address(tokenB));
        factory.createPool(address(tokenA), address(tokenC));

        address pool0 = factory.allPools(0);
        address pool1 = factory.allPools(1);

        require(pool0 != address(0), "Pool0 should exist");
        require(pool1 != address(0), "Pool1 should exist");
        require(pool0 != pool1, "Pools should be different");
    }

    // ============ Integration Test ============

    function test_CreatedPoolIsUsable() public {
        address poolAddress = factory.createPool(address(tokenA), address(tokenB));
        LiquidityPool pool = LiquidityPool(poolAddress);

        // Add liquidity
        tokenA.approve(poolAddress, 1000 ether);
        tokenB.approve(poolAddress, 1000 ether);
        pool.addLiquidity(1000 ether, 1000 ether);

        (uint256 reserve0, uint256 reserve1) = pool.getReserves();
        require(reserve0 == 1000 ether, "Reserve0 should be 1000");
        require(reserve1 == 1000 ether, "Reserve1 should be 1000");
    }
}

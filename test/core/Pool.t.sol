// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/core/Pool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @dev Simple mock ERC20 token for isolated pool testing (both 18 decimals)
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PoolTest is Test {
    Pool public pool;
    MockToken public tokenA;
    MockToken public tokenB;

    // Sorted references (token0 < token1)
    address public token0;
    address public token1;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    address private constant DEAD_ADDRESS = address(0xdEaD);

    function setUp() public {
        // Deploy tokens
        tokenA = new MockToken("Token A", "TKA");
        tokenB = new MockToken("Token B", "TKB");

        // Sort tokens by address (canonical ordering)
        if (address(tokenA) < address(tokenB)) {
            token0 = address(tokenA);
            token1 = address(tokenB);
        } else {
            token0 = address(tokenB);
            token1 = address(tokenA);
        }

        // Deploy pool with sorted tokens
        pool = new Pool(token0, token1);

        // Label for readable traces
        vm.label(address(pool), "Pool");
        vm.label(token0, "Token0");
        vm.label(token1, "Token1");
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
    }

    // ─── Helper ────────────────────────────────────────────────────────

    function _addLiquidity(uint256 amount0, uint256 amount1) internal returns (uint256 liquidity) {
        IERC20(token0).transfer(address(pool), amount0);
        IERC20(token1).transfer(address(pool), amount1);
        liquidity = pool.mint(address(this));
    }

    // ─── Test 1: Initial State ─────────────────────────────────────────

    function test_InitialState() public view {
        assertEq(pool.token0(), token0);
        assertEq(pool.token1(), token1);
        assertEq(pool.totalSupply(), 0);

        (uint112 r0, uint112 r1) = pool.getReserves();
        assertEq(r0, 0);
        assertEq(r1, 0);
    }

    // ─── Test 2: LP Token Name and Symbol ──────────────────────────────

    function test_LPTokenNameAndSymbol() public view {
        string memory expectedName = string(
            abi.encodePacked(
                "SimpleDEX ",
                IERC20Metadata(token0).symbol(),
                "-",
                IERC20Metadata(token1).symbol(),
                " LP"
            )
        );
        string memory expectedSymbol = string(
            abi.encodePacked("SLP-", IERC20Metadata(token0).symbol(), "-", IERC20Metadata(token1).symbol())
        );

        assertEq(pool.name(), expectedName);
        assertEq(pool.symbol(), expectedSymbol);
    }

    // ─── Test 3: First Mint with MINIMUM_LIQUIDITY Burn ────────────────

    function test_MintFirstLiquidity() public {
        uint256 amount0 = 1000e18;
        uint256 amount1 = 4000e18;

        IERC20(token0).transfer(address(pool), amount0);
        IERC20(token1).transfer(address(pool), amount1);

        uint256 expectedLiquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
        uint256 liquidity = pool.mint(address(this));

        assertEq(liquidity, expectedLiquidity);

        // MINIMUM_LIQUIDITY locked at dead address (OZ v5 rejects mint to address(0))
        assertEq(pool.balanceOf(DEAD_ADDRESS), MINIMUM_LIQUIDITY);

        // Total supply = minted + burned
        assertEq(pool.totalSupply(), expectedLiquidity + MINIMUM_LIQUIDITY);

        // Reserves updated
        (uint112 r0, uint112 r1) = pool.getReserves();
        assertEq(r0, amount0);
        assertEq(r1, amount1);
    }

    // ─── Test 4: Subsequent Mint (Proportional) ────────────────────────

    function test_MintSubsequentLiquidity() public {
        // First deposit
        _addLiquidity(1000e18, 1000e18);
        uint256 totalSupplyAfterFirst = pool.totalSupply();

        // Second deposit: double the first
        uint256 amount0 = 1000e18;
        uint256 amount1 = 1000e18;
        IERC20(token0).transfer(address(pool), amount0);
        IERC20(token1).transfer(address(pool), amount1);

        uint256 liquidity = pool.mint(alice);

        // Proportional: should get roughly same LP as first deposit (minus MINIMUM_LIQUIDITY)
        uint256 expectedLiquidity = Math.min(
            (amount0 * totalSupplyAfterFirst) / 1000e18,
            (amount1 * totalSupplyAfterFirst) / 1000e18
        );
        assertEq(liquidity, expectedLiquidity);
        assertEq(pool.balanceOf(alice), liquidity);
    }

    // ─── Test 5: Burn (Remove Liquidity) ───────────────────────────────

    function test_Burn() public {
        uint256 liquidity = _addLiquidity(1000e18, 2000e18);

        uint256 balanceBefore0 = IERC20(token0).balanceOf(bob);
        uint256 balanceBefore1 = IERC20(token1).balanceOf(bob);

        // Transfer LP tokens to pool, then burn
        pool.transfer(address(pool), liquidity);
        (uint256 amount0, uint256 amount1) = pool.burn(bob);

        assertGt(amount0, 0);
        assertGt(amount1, 0);

        // Bob received the tokens
        assertEq(IERC20(token0).balanceOf(bob), balanceBefore0 + amount0);
        assertEq(IERC20(token1).balanceOf(bob), balanceBefore1 + amount1);

        // LP tokens burned (only MINIMUM_LIQUIDITY remains in supply)
        assertEq(pool.balanceOf(address(this)), 0);
    }

    // ─── Test 6: Swap (token0 -> token1) ───────────────────────────────

    function test_Swap() public {
        _addLiquidity(1000e18, 1000e18);

        uint256 amountIn = 100e18;
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 expectedOut = pool.getAmountOut(amountIn, r0, r1);

        // Transfer input tokens to pool
        IERC20(token0).transfer(address(pool), amountIn);

        // Swap: receive token1
        uint256 balanceBefore = IERC20(token1).balanceOf(alice);
        pool.swap(0, expectedOut, alice);
        uint256 balanceAfter = IERC20(token1).balanceOf(alice);

        assertEq(balanceAfter - balanceBefore, expectedOut);
        assertGt(expectedOut, 0);
    }

    // ─── Test 7: Swap Reverse Direction (token1 -> token0) ─────────────

    function test_SwapReverseDirection() public {
        _addLiquidity(1000e18, 1000e18);

        uint256 amountIn = 50e18;
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 expectedOut = pool.getAmountOut(amountIn, r1, r0);

        // Transfer token1 to pool
        IERC20(token1).transfer(address(pool), amountIn);

        // Swap: receive token0
        uint256 balanceBefore = IERC20(token0).balanceOf(alice);
        pool.swap(expectedOut, 0, alice);
        uint256 balanceAfter = IERC20(token0).balanceOf(alice);

        assertEq(balanceAfter - balanceBefore, expectedOut);
        assertGt(expectedOut, 0);
    }

    // ─── Test 8: Fees Accumulate in Reserves ───────────────────────────

    function test_SwapFeesAccumulate() public {
        _addLiquidity(1000e18, 1000e18);

        (uint112 r0Before, uint112 r1Before) = pool.getReserves();
        uint256 kBefore = uint256(r0Before) * uint256(r1Before);

        // Execute a swap: token0 -> token1
        uint256 amountIn = 100e18;
        uint256 expectedOut = pool.getAmountOut(amountIn, r0Before, r1Before);
        IERC20(token0).transfer(address(pool), amountIn);
        pool.swap(0, expectedOut, alice);

        (uint112 r0After, uint112 r1After) = pool.getReserves();
        uint256 kAfter = uint256(r0After) * uint256(r1After);

        // After swap with fees, k should INCREASE (fees stay in pool)
        assertGt(kAfter, kBefore, "k should increase due to fees");
    }

    // ─── Test 9: getAmountOut Matches Actual Swap ──────────────────────

    function test_GetAmountOut() public {
        _addLiquidity(1000e18, 2000e18);

        uint256 amountIn = 10e18;
        (uint112 r0, uint112 r1) = pool.getReserves();

        // Calculate expected output
        uint256 expectedOut = pool.getAmountOut(amountIn, r0, r1);

        // Execute swap
        IERC20(token0).transfer(address(pool), amountIn);
        uint256 balanceBefore = IERC20(token1).balanceOf(bob);
        pool.swap(0, expectedOut, bob);
        uint256 actualOut = IERC20(token1).balanceOf(bob) - balanceBefore;

        // Actual output matches getAmountOut prediction
        assertEq(actualOut, expectedOut);
    }

    // ─── Test 10: Slippage Protection (K Invariant Check) ──────────────

    function test_SlippageProtection() public {
        _addLiquidity(1000e18, 1000e18);

        uint256 amountIn = 100e18;
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 fairOut = pool.getAmountOut(amountIn, r0, r1);

        // Transfer input tokens
        IERC20(token0).transfer(address(pool), amountIn);

        // Try to extract MORE than the fair output (violates k invariant)
        vm.expectRevert("Pool: K");
        pool.swap(0, fairOut + 1, alice);
    }

    // ─── Test 11: Revert on Zero Liquidity ─────────────────────────────

    function test_RevertOnZeroLiquidity() public {
        // Try to mint with 0 tokens transferred
        vm.expectRevert(); // Underflow or INSUFFICIENT_LIQUIDITY_MINTED
        pool.mint(address(this));
    }

    // ─── Test 12: Emits Swap Event ─────────────────────────────────────

    function test_EmitsSwapEvent() public {
        _addLiquidity(1000e18, 1000e18);

        uint256 amountIn = 100e18;
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 expectedOut = pool.getAmountOut(amountIn, r0, r1);

        IERC20(token0).transfer(address(pool), amountIn);

        // Expect Swap event with correct parameters
        vm.expectEmit(true, true, false, true);
        emit Pool.Swap(address(this), amountIn, 0, 0, expectedOut, alice);

        pool.swap(0, expectedOut, alice);
    }
}

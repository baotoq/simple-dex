// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ERC20Base
 * @notice Abstract base contract implementing the ERC-20 token standard
 * @dev This is an "abstract" contract - it cannot be deployed directly.
 *      Other contracts must inherit from it and implement the constructor.
 *
 * ERC-20 is THE standard for fungible tokens on Ethereum. It defines:
 * - How to transfer tokens between addresses
 * - How to check balances
 * - How to allow others to spend your tokens (approve/transferFrom)
 *
 * The approve/transferFrom pattern is CRITICAL for DeFi:
 * 1. User calls approve(spender, amount) to allow a contract to spend their tokens
 * 2. The contract then calls transferFrom(user, recipient, amount) to move tokens
 * This two-step process is how DEXes, lending protocols, etc. work!
 */
abstract contract ERC20Base {
    // ============ State Variables ============

    /// @notice Token name (e.g., "Ethereum")
    string public name;

    /// @notice Token symbol (e.g., "ETH")
    string public symbol;

    /// @notice Number of decimals (almost always 18 for ERC-20 tokens)
    /// @dev 18 decimals means 1 token = 1e18 (1000000000000000000) base units
    uint8 public constant decimals = 18;

    /// @notice Total supply of tokens in existence
    uint256 public totalSupply;

    /// @notice Mapping from address to their token balance
    /// @dev balanceOf[0x123...] returns how many tokens that address owns
    mapping(address => uint256) public balanceOf;

    /// @notice Nested mapping for allowances: owner => spender => amount
    /// @dev allowance[owner][spender] = how much spender can spend of owner's tokens
    mapping(address => mapping(address => uint256)) public allowance;

    // ============ Events ============
    // Events are logs stored on the blockchain. They're cheap to emit
    // and can be queried by off-chain applications (like frontends).

    /// @notice Emitted when tokens are transferred
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @notice Emitted when an allowance is set
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ============ Constructor ============

    /**
     * @notice Initialize the token with name and symbol
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     */
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    // ============ External Functions ============

    /**
     * @notice Transfer tokens to another address
     * @param to The recipient address
     * @param amount The amount to transfer (in base units, so 1e18 = 1 token)
     * @return success Always returns true (reverts on failure)
     *
     * @dev This is the simple transfer - you send YOUR tokens to someone else.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        // Use internal function to do the actual transfer
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve another address to spend your tokens
     * @param spender The address allowed to spend tokens
     * @param amount The maximum amount they can spend
     * @return success Always returns true
     *
     * @dev WHY IS THIS NEEDED?
     * Smart contracts can't "pull" tokens from your wallet without permission.
     * When you want to use a DEX:
     * 1. You first approve() the DEX contract to spend your tokens
     * 2. Then you call the DEX's swap function
     * 3. The DEX uses transferFrom() to take your tokens
     *
     * This is the "approve pattern" - fundamental to all of DeFi!
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        // Store the allowance
        allowance[msg.sender][spender] = amount;

        // Emit event so off-chain apps can track approvals
        emit Approval(msg.sender, spender, amount);

        return true;
    }

    /**
     * @notice Transfer tokens on behalf of another address (requires approval)
     * @param from The address to take tokens from
     * @param to The address to send tokens to
     * @param amount The amount to transfer
     * @return success Always returns true (reverts on failure)
     *
     * @dev This is the "pull" pattern used by DEXes and other DeFi protocols.
     * The caller (msg.sender) must have been approved by 'from' to spend >= amount.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        // Check that caller has enough allowance
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        // Reduce the allowance (prevents spending more than approved)
        // Using unchecked because we already verified currentAllowance >= amount
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }

        // Do the transfer
        _transfer(from, to, amount);

        return true;
    }

    // ============ Internal Functions ============
    // Internal functions can only be called from within this contract
    // or contracts that inherit from it. They start with underscore by convention.

    /**
     * @notice Internal function to handle transfers
     * @dev Checks balances and moves tokens. Used by both transfer() and transferFrom()
     */
    function _transfer(address from, address to, uint256 amount) internal {
        // Safety checks
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");

        // Update balances
        // unchecked saves gas when we know underflow/overflow can't happen
        unchecked {
            balanceOf[from] -= amount;  // Safe: we checked balance above
            balanceOf[to] += amount;    // Safe: totalSupply is capped
        }

        // Emit event
        emit Transfer(from, to, amount);
    }

    /**
     * @notice Internal function to create new tokens
     * @param to The address to receive the new tokens
     * @param amount The amount to mint
     * @dev Only callable by child contracts. Increases totalSupply.
     */
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ERC20: mint to zero address");

        totalSupply += amount;
        balanceOf[to] += amount;

        // Transfer from address(0) indicates minting (new tokens created)
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Internal function to destroy tokens
     * @param from The address to burn tokens from
     * @param amount The amount to burn
     * @dev Only callable by child contracts. Decreases totalSupply.
     */
    function _burn(address from, uint256 amount) internal {
        require(from != address(0), "ERC20: burn from zero address");
        require(balanceOf[from] >= amount, "ERC20: insufficient balance to burn");

        unchecked {
            balanceOf[from] -= amount;
        }
        totalSupply -= amount;

        // Transfer to address(0) indicates burning (tokens destroyed)
        emit Transfer(from, address(0), amount);
    }
}

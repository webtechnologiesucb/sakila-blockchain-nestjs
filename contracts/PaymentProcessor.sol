// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * =============================================================
 * PaymentProcessor Smart Contract
 * =============================================================
 * Purpose:
 *   Registers rental payments from the Sakila database onto
 *   the Ethereum blockchain. Each payment is recorded with its
 *   Sakila payment_id, an amount in ETH, and a text reference.
 *
 * Architecture:
 *   - The contract owner (deployer) is the store/backend.
 *   - Customers send ETH to this contract to pay for rentals.
 *   - Each payment emits a PaymentRegistered event for off-chain
 *     indexing by the NestJS backend.
 *   - The owner can withdraw accumulated funds.
 *
 * Events:
 *   - PaymentRegistered: emitted on every successful payment
 *   - PaymentStatusUpdated: emitted when payment status changes
 *   - FundsWithdrawn: emitted when owner withdraws funds
 *
 * Security:
 *   - onlyOwner modifier for administrative functions
 *   - ReentrancyGuard pattern for withdrawals
 *   - Input validation on all public functions
 * =============================================================
 */

contract PaymentProcessor {

    // =========================================================
    // State Variables
    // =========================================================

    /// @notice Address of the contract owner (deployer)
    address public owner;

    /// @notice Counter for total payments processed
    uint256 public totalPayments;

    /// @notice Possible statuses for a payment
    enum PaymentStatus { PENDING, CONFIRMED, FAILED, REFUNDED }

    /// @notice Structure representing a single payment record
    struct Payment {
        uint256 paymentId;      // Sakila payment_id reference
        address payer;          // Customer's wallet address
        uint256 amount;         // Amount in wei
        string paymentRef;      // Descriptive reference (e.g., "Rental #1234")
        PaymentStatus status;   // Current status
        uint256 timestamp;      // Block timestamp when recorded
        bool exists;            // Flag to check existence
    }

    /// @notice Mapping from Sakila payment_id to Payment struct
    mapping(uint256 => Payment) public payments;

    /// @notice Mapping to track all payment IDs for enumeration
    uint256[] public paymentIds;

    /// @notice Reentrancy guard flag
    bool private locked;

    // =========================================================
    // Events
    // =========================================================

    /// @notice Emitted when a new payment is registered
    /// @param paymentId The Sakila payment_id
    /// @param payer The address that sent the payment
    /// @param amount The amount in wei
    /// @param paymentRef A human-readable paymentRef string
    event PaymentRegistered(
        uint256 indexed paymentId,
        address indexed payer,
        uint256 amount,
        string paymentRef
    );

    /// @notice Emitted when a payment's status is updated
    /// @param paymentId The Sakila payment_id
    /// @param oldStatus Previous status
    /// @param newStatus New status
    event PaymentStatusUpdated(
        uint256 indexed paymentId,
        PaymentStatus oldStatus,
        PaymentStatus newStatus
    );

    /// @notice Emitted when the owner withdraws funds
    /// @param owner The owner's address
    /// @param amount The amount withdrawn in wei
    event FundsWithdrawn(
        address indexed owner,
        uint256 amount
    );

    // =========================================================
    // Modifiers
    // =========================================================

    /// @notice Restricts function access to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "PaymentProcessor: caller is not the owner");
        _;
    }

    /// @notice Prevents reentrant calls
    modifier noReentrant() {
        require(!locked, "PaymentProcessor: reentrant call detected");
        locked = true;
        _;
        locked = false;
    }

    // =========================================================
    // Constructor
    // =========================================================

    /// @notice Sets the deployer as the contract owner
    constructor() {
        owner = msg.sender;
        totalPayments = 0;
        locked = false;
    }

    // =========================================================
    // Core Functions
    // =========================================================

    /**
     * @notice Register a payment on the blockchain
     * @dev The caller must send ETH with this transaction (msg.value > 0).
     *      The paymentId must correspond to a valid Sakila payment_id and
     *      must not have been previously registered.
     * @param _paymentId The Sakila payment_id to link this transaction to
     * @param _paymentRef A descriptive reference (e.g., "Rental Payment #42")
     */
    function registerPayment(
        uint256 _paymentId,
        string calldata _paymentRef
    ) external payable {
        // Validate: must send ETH
        require(msg.value > 0, "PaymentProcessor: payment amount must be > 0");

        // Validate: payment must not already exist
        require(!payments[_paymentId].exists, "PaymentProcessor: payment already registered");

        // Validate: reference must not be empty
        require(bytes(_paymentRef).length > 0, "PaymentProcessor: reference cannot be empty");

        // Record the payment
        payments[_paymentId] = Payment({
            paymentId: _paymentId,
            payer: msg.sender,
            amount: msg.value,
            paymentRef: _paymentRef,
            status: PaymentStatus.CONFIRMED,
            timestamp: block.timestamp,
            exists: true
        });

        // Track payment ID for enumeration
        paymentIds.push(_paymentId);
        totalPayments++;

        // Emit event for off-chain indexing
        emit PaymentRegistered(_paymentId, msg.sender, msg.value, _paymentRef);
    }

    /**
     * @notice Retrieve payment details by Sakila payment_id
     * @param _paymentId The Sakila payment_id to query
     * @return paymentId The payment ID
     * @return payer The address that made the payment
     * @return amount The payment amount in wei
     * @return paymentRef The payment reference string
     * @return status The current payment status
     * @return timestamp The block timestamp of the payment
     */
    function getPayment(uint256 _paymentId)
        external
        view
        returns (
            uint256 paymentId,
            address payer,
            uint256 amount,
            string memory paymentRef,
            PaymentStatus status,
            uint256 timestamp
        )
    {
        require(payments[_paymentId].exists, "PaymentProcessor: payment not found");

        Payment storage p = payments[_paymentId];
        return (p.paymentId, p.payer, p.amount, p.paymentRef, p.status, p.timestamp);
    }

    /**
     * @notice Update the status of an existing payment
     * @dev Only the contract owner can update payment statuses.
     *      This is used by the NestJS backend to sync states.
     * @param _paymentId The Sakila payment_id
     * @param _newStatus The new status to set
     */
    function updatePaymentStatus(
        uint256 _paymentId,
        PaymentStatus _newStatus
    ) external onlyOwner {
        require(payments[_paymentId].exists, "PaymentProcessor: payment not found");

        PaymentStatus oldStatus = payments[_paymentId].status;
        require(oldStatus != _newStatus, "PaymentProcessor: status unchanged");

        payments[_paymentId].status = _newStatus;

        emit PaymentStatusUpdated(_paymentId, oldStatus, _newStatus);
    }

    /**
     * @notice Check if a payment exists on-chain
     * @param _paymentId The Sakila payment_id to check
     * @return exists True if the payment is registered
     */
    function paymentExists(uint256 _paymentId) external view returns (bool) {
        return payments[_paymentId].exists;
    }

    /**
     * @notice Get the total number of payment IDs recorded
     * @return count The total count
     */
    function getPaymentCount() external view returns (uint256) {
        return paymentIds.length;
    }

    /**
     * @notice Get the contract's ETH balance
     * @return balance The balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // =========================================================
    // Administrative Functions
    // =========================================================

    /**
     * @notice Withdraw all ETH from the contract to the owner
     * @dev Protected by onlyOwner and noReentrant modifiers.
     *      Uses call instead of transfer for gas flexibility.
     */
    function withdraw() external onlyOwner noReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "PaymentProcessor: no funds to withdraw");

        // Use call for better gas handling (recommended over transfer)
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "PaymentProcessor: withdrawal failed");

        emit FundsWithdrawn(owner, balance);
    }

    /**
     * @notice Transfer ownership to a new address
     * @param _newOwner The new owner's address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "PaymentProcessor: new owner is zero address");
        owner = _newOwner;
    }

    // =========================================================
    // Receive & Fallback
    // =========================================================

    /// @notice Accept direct ETH transfers
    receive() external payable {}

    /// @notice Fallback for unrecognized calls
    fallback() external payable {}
}

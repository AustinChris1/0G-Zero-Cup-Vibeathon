// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Receipts Leaderboard
/// @notice Trustless settlement layer for sealed AI predictions on 0G Chain.
///         Picks are sealed off-chain (0G Compute + 0G Storage); this contract
///         anchors each receipt's storage root and settles results so the
///         leaderboard is reconstructable by anyone from chain state alone.
contract Leaderboard {
    struct Receipt {
        bytes32 storageRoot; // 0G Storage merkle root of the sealed pick
        bytes32 payloadHash; // keccak256 of the signed (request + response)
        address agent; // owner / agent identity
        bytes32 matchId; // fixture identifier
        uint8 pick; // 0 = HOME, 1 = DRAW, 2 = AWAY
        uint64 sealedAt; // unix seconds, must be < kickoff
        bool resolved;
        bool correct;
    }

    address public immutable oracle;

    mapping(bytes32 => Receipt) public receipts; // receiptId => Receipt
    mapping(bytes32 => uint8) public results; // matchId => outcome (+1 offset)
    mapping(address => uint32) public sealedCount;
    mapping(address => uint32) public correctCount;

    event Sealed(bytes32 indexed receiptId, address indexed agent, bytes32 indexed matchId);
    event Resolved(bytes32 indexed matchId, uint8 outcome);
    event Scored(bytes32 indexed receiptId, address indexed agent, bool correct);

    error AlreadySealed();
    error NotOracle();
    error SealedAfterKickoff();
    error UnknownReceipt();

    constructor(address _oracle) {
        oracle = _oracle;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    /// @notice Anchor a sealed pick. Reverts if the receipt id already exists,
    ///         which is what makes a call permanent and un-editable.
    function sealPick(
        bytes32 receiptId,
        bytes32 storageRoot,
        bytes32 payloadHash,
        bytes32 matchId,
        uint8 pick,
        uint64 sealedAt,
        uint64 kickoff
    ) external {
        if (receipts[receiptId].sealedAt != 0) revert AlreadySealed();
        if (sealedAt >= kickoff) revert SealedAfterKickoff();

        receipts[receiptId] = Receipt({
            storageRoot: storageRoot,
            payloadHash: payloadHash,
            agent: msg.sender,
            matchId: matchId,
            pick: pick,
            sealedAt: sealedAt,
            resolved: false,
            correct: false
        });
        sealedCount[msg.sender] += 1;
        emit Sealed(receiptId, msg.sender, matchId);
    }

    /// @notice Record a final outcome for a match (oracle only).
    function recordResult(bytes32 matchId, uint8 outcome) external onlyOracle {
        results[matchId] = outcome + 1;
        emit Resolved(matchId, outcome);
    }

    /// @notice Score a sealed receipt against its match result. Idempotent.
    function scoreReceipt(bytes32 receiptId) external {
        Receipt storage r = receipts[receiptId];
        if (r.sealedAt == 0) revert UnknownReceipt();
        uint8 stored = results[r.matchId];
        require(stored != 0, "result not in");
        if (r.resolved) return;

        r.resolved = true;
        r.correct = (r.pick == stored - 1);
        if (r.correct) correctCount[r.agent] += 1;
        emit Scored(receiptId, r.agent, r.correct);
    }
}

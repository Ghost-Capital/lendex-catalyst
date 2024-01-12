// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
// import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
// import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract FunctionsConsumerExample is IERC721Receiver {
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);


    /**
     * @notice who mint the smart contract. For now we'll prevent some actions to only be executed by this address e.g claiming tokens
     */
    address _owner;

    /**
     * @notice current state of each token
     */
    mapping (uint256 => State) public states;

    /**
     * @notice token's owner 
     */
    mapping (uint256 => address) owners;

    /**
     * @notice tokens from each user 
     */
    mapping (address => mapping (uint256 => Info)) tokens;

    error UnexpectedBorrowToken(uint256 tokenId, State status);
    error UnexpectedPaidTokenDebt(uint256 tokenId);
    error UnexpectedClaimToken(uint256 tokenId);

    struct Info {
        address nftContract;
        address lender;
        uint256 deadline;
        int amount;
        int decimals;
        string token; // Only ADA for now
    }

    enum State { 
        LOCKED, 
        WAITING_PAYMENT,
        DEBT_PAID
    }

    /**
     * @notice validate access
     */
    function _validateOwnership() internal view {
        require(msg.sender == _owner, 'Only callable by owner');
    }

    /**
     * @notice Reverts if called by anyone other than the contract owner.
     */
    modifier onlyOwner() {
        _validateOwnership();
        _;
    }

    constructor () {
        _owner = msg.sender;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        Info storage _info = _getTokenInfo(from, tokenId);
        require(_info.nftContract == address(0), 'Token already locked');

        tokens[from][tokenId] = _buildTokenInfo(msg.sender, _info, data);
        states[tokenId] = State.LOCKED;
        owners[tokenId] = from;

        return this.onERC721Received.selector;
    }

    function borrowToken(uint256 tokenId, address lender) public onlyOwner {
        State status = states[tokenId];
        if (status == State.LOCKED) {
            address owner = owners[tokenId];
            Info storage info = _getTokenInfo(owner, tokenId);
            require(info.nftContract != address(0), 'Only owner can borrow');
            states[tokenId] = State.WAITING_PAYMENT;
            tokens[owner][tokenId].lender = lender;
        } else {
            revert UnexpectedBorrowToken(tokenId, status);
        }
    }

    function paidTokenDebt(uint256 tokenId) public {
        address owner = owners[tokenId];
        require(msg.sender == owner, 'Only token owner can paid token debt');
        
        State status = states[tokenId];
        Info storage info = _getTokenInfo(owner, tokenId);
        if (status == State.WAITING_PAYMENT && block.timestamp <= info.deadline) {
            states[tokenId] = State.DEBT_PAID;
        } else {
            revert UnexpectedPaidTokenDebt(tokenId);
        }
    }

    // If we want to make this function cost effective using chainlink functions
    // We can considering make it payable and request an amount equivalent to the LINK cost for calling chainlink plus our fees
    function claimToken(uint256 tokenId) public {  
        State status = states[tokenId];
        Info storage info = _getTokenInfo(msg.sender, tokenId);
        if (status == State.LOCKED || status == State.DEBT_PAID) { // token wasn't borrowed or debt have been paid on time
            require(info.nftContract != address(0), 'Only owner can claim token if not borrowed or with debt paid');
            _safeTransferFrom(info.nftContract, address(this), msg.sender, tokenId);
        } else if (status == State.WAITING_PAYMENT && (info.deadline != 0 && block.timestamp > info.deadline)) {
            require(msg.sender == info.lender);
            _safeTransferFrom(info.nftContract, address(this), msg.sender, tokenId);
        } else {
            revert UnexpectedClaimToken(tokenId);
        }
    }

    function _buildTokenInfo(address _contract, Info storage info, bytes calldata data) internal returns (Info storage) {
        (uint256 deadline, int amount, string memory token) = abi.decode(data, (uint256, int, string));
        require(keccak256(abi.encodePacked(token)) == keccak256(abi.encodePacked('ADA')), 'Only ADA token supported');
        require(amount >= 1_000_000, 'Minimun 1 ADA to be lended');
        // TODO: uncomment this when ready for production
        // require(deadline >= 86_400, 'Minimum 1 day deadline');
        info.nftContract = _contract;
        info.deadline = block.timestamp + deadline;
        info.amount = amount;
        info.decimals = 1_000_000;
        info.token = token;
        return info;
    }

    function _getTokenInfo(address ref, uint256 tokenId) internal view returns (Info storage) {
        return tokens[ref][tokenId];
    }

    function _safeTransferFrom(address _contract, address from, address to, uint256 tokenId) internal {
        IERC721(_contract).safeTransferFrom(from, to, tokenId, "");
    }
























    // constructor(
    //     address router
    // ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
    //     _owner == msg.sender;
    // }

    // /**
    //  * @notice Send a simple request
    //  * @param source JavaScript source code
    //  * @param encryptedSecretsUrls Encrypted URLs where to fetch user secrets
    //  * @param donHostedSecretsSlotID Don hosted secrets slotId
    //  * @param donHostedSecretsVersion Don hosted secrets version
    //  * @param args List of arguments accessible from within the source code
    //  * @param bytesArgs Array of bytes arguments, represented as hex strings
    //  * @param subscriptionId Billing ID
    //  */
    // function sendRequest(
    //     string memory source,
    //     bytes memory encryptedSecretsUrls,
    //     uint8 donHostedSecretsSlotID,
    //     uint64 donHostedSecretsVersion,
    //     string[] memory args,
    //     bytes[] memory bytesArgs,
    //     uint64 subscriptionId,
    //     uint32 gasLimit,
    //     bytes32 donID
    // ) external onlyOwner returns (bytes32 requestId) {
    //     FunctionsRequest.Request memory req;
    //     req.initializeRequestForInlineJavaScript(source);
    //     if (encryptedSecretsUrls.length > 0)
    //         req.addSecretsReference(encryptedSecretsUrls);
    //     else if (donHostedSecretsVersion > 0) {
    //         req.addDONHostedSecrets(
    //             donHostedSecretsSlotID,
    //             donHostedSecretsVersion
    //         );
    //     }
    //     if (args.length > 0) req.setArgs(args);
    //     if (bytesArgs.length > 0) req.setBytesArgs(bytesArgs);
    //     s_lastRequestId = _sendRequest(
    //         req.encodeCBOR(),
    //         subscriptionId,
    //         gasLimit,
    //         donID
    //     );
    //     return s_lastRequestId;
    // }

    // /**
    //  * @notice Send a pre-encoded CBOR request
    //  * @param request CBOR-encoded request data
    //  * @param subscriptionId Billing ID
    //  * @param gasLimit The maximum amount of gas the request can consume
    //  * @param donID ID of the job to be invoked
    //  * @return requestId The ID of the sent request
    //  */
    // function sendRequestCBOR(
    //     bytes memory request,
    //     uint64 subscriptionId,
    //     uint32 gasLimit,
    //     bytes32 donID
    // ) external onlyOwner returns (bytes32 requestId) {
    //     s_lastRequestId = _sendRequest(
    //         request,
    //         subscriptionId,
    //         gasLimit,
    //         donID
    //     );
    //     return s_lastRequestId;
    // }

    // /**
    //  * @notice Store latest result/error
    //  * @param requestId The request ID, returned by sendRequest()
    //  * @param response Aggregated response from the user code
    //  * @param err Aggregated error from the user code or from the execution pipeline
    //  * Either response or error parameter will be set, but never both
    //  */
    // function fulfillRequest(
    //     bytes32 requestId,
    //     bytes memory response,
    //     bytes memory err
    // ) internal override {
    //     if (s_lastRequestId != requestId) {
    //         revert UnexpectedRequestID(requestId);
    //     }
    //     s_lastResponse = response;
    //     s_lastError = err;
    //     emit Response(requestId, s_lastResponse, s_lastError);
    // }
}
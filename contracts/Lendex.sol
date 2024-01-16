// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
// import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
// import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Remove this on production
import "hardhat/console.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract Lendex is IERC721Receiver {
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
    mapping(address => mapping(uint256 => State)) states;

    /**
     * @notice token's owner 
     */
    mapping(address => mapping(uint256 => address)) owners;

    /**
     * @notice tokens from each user 
     */
    mapping(address => mapping(address => mapping(uint256 => Info))) tokens;

    error UnexpectedBorrowToken(uint256 tokenId, State status);
    error UnexpectedPaidTokenDebt(uint256 tokenId);
    error UnexpectedClaimToken(uint256 tokenId);

    struct Info {
        address lender;
        uint256 deadline;
        int amount;
        int decimals;
        string token; // Only ADA for now
    }

    enum State {
        UNKNOWN,
        LOCKED, 
        WAITING_PAYMENT,
        DEBT_PAID
    }

    /**
     * @notice validate access
     */
    function _validateOwnership() internal view {
        require(msg.sender == _owner, "Only callable by owner");
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
        address _contract = msg.sender;
        require(states[_contract][tokenId] == State.UNKNOWN, "Token already in use");
        
        tokens[from][_contract][tokenId] = _buildTokenInfo(_getTokenInfo(from, _contract, tokenId), data);
        states[_contract][tokenId] = State.LOCKED;
        owners[_contract][tokenId] = from;

        return this.onERC721Received.selector;
    }

    function borrowToken(address _contract, uint256 tokenId, address lender) public onlyOwner {
        require(_contract != address(0), "Only owner can borrow");

        State status = states[_contract][tokenId];
        if (status == State.LOCKED) {
            address owner = owners[_contract][tokenId];
            states[_contract][tokenId] = State.WAITING_PAYMENT;
            tokens[owner][_contract][tokenId].lender = lender;
        } else {
            revert UnexpectedBorrowToken(tokenId, status);
        }
    }

    function payTokenDebt(address _contract, uint256 tokenId) public {
        address owner = owners[_contract][tokenId];
        require(msg.sender == owner, "Only token owner can paid token debt");
        
        State status = states[_contract][tokenId];
        Info storage info = _getTokenInfo(owner, _contract, tokenId);
        if (status == State.WAITING_PAYMENT && block.timestamp <= info.deadline) {
            states[_contract][tokenId] = State.DEBT_PAID;
        } else {
            revert UnexpectedPaidTokenDebt(tokenId);
        }
    }

    // If we want to make this function cost effective using chainlink functions
    // We can considering make it payable and request an amount equivalent to the LINK cost for calling chainlink plus our fees
    function claimToken(address _contract, uint256 tokenId) public {  
        require(_contract != address(0), "Only owner can claim token if not borrowed or with debt paid");

        State status = states[_contract][tokenId];
        address owner = owners[_contract][tokenId];
        Info storage info = _getTokenInfo(owner, _contract, tokenId);
        if (status == State.LOCKED || status == State.DEBT_PAID) { // token wasn't borrowed or debt have been paid on time
            require(msg.sender == owner, "Only owner can claim token locked or paid");

            _safeTransferFrom(_contract, address(this), owner, tokenId);
            _deleteToken(_contract, tokenId);
        } else if (status == State.WAITING_PAYMENT && (info.deadline != 0 && block.timestamp > info.deadline)) {
            require(msg.sender == info.lender, "Only lender can claim token after deadline");

            _safeTransferFrom(_contract, address(this), info.lender, tokenId);
            _deleteToken(_contract, tokenId);
        } else {
            revert UnexpectedClaimToken(tokenId);
        }
    }

    // *********************** VIEWS *****************************************
    function getToken(address owner, address _contract, uint256 tokenId) public view returns (Info memory, State) {
        return (tokens[owner][_contract][tokenId], states[_contract][tokenId]);
    }

    function getTokenOwner(address _contract, uint256 tokenId) public view returns (address) {
        return owners[_contract][tokenId];
    }

    function _deleteToken(address _contract, uint256 tokenId) internal {
        address owner = owners[_contract][tokenId];
        delete owners[_contract][tokenId];
        delete states[_contract][tokenId];
        delete tokens[owner][_contract][tokenId];
    }

    function _buildTokenInfo(Info storage info, bytes calldata data) internal returns (Info storage) {
        (uint256 deadline, int amount, string memory currency) = abi.decode(data, (uint256, int, string));
        require(keccak256(abi.encodePacked(currency)) == keccak256(abi.encodePacked("ADA")), "Only ADA currency supported");
        require(amount >= 1_000_000, "Minimun 1 ADA to be lended");
        require(deadline >= 86_400, "Minimum 1 day deadline");
        info.deadline = block.timestamp + deadline;
        info.amount = amount;
        info.decimals = 1_000_000;
        info.token = currency;
        return info;
    }

    function _getTokenInfo(address owner, address _contract, uint256 tokenId) internal view returns (Info storage) {
        return tokens[owner][_contract][tokenId];
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
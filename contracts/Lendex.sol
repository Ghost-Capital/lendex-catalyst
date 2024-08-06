// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { FunctionsClient } from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import { ConfirmedOwner } from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import { FunctionsRequest } from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// Remove this on production
import "hardhat/console.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract Lendex is IERC721Receiver, FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;
    using Strings for uint256;

    error UnexpectedRequestID(bytes32 requestId);

    event FulfillResponse(bytes32 indexed requestId, OracleRequestType _type, bytes response, bytes err);

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

    // JavaScript source code
    bytes32 _sourceHash;
    uint64 _subscriptionId;
    bytes32 _donID;

    uint256 tokenCount;

    mapping (bytes32 => OracleRequest) oracleRequests;

    error UnexpectedBorrowToken(uint256 tokenId, State status);
    error UnexpectedPaidTokenDebt(uint256 tokenId, State status);
    error UnexpectedClaimToken(uint256 tokenId);

    struct Fee {
        int n;
        int d;
    }

    struct Info {
        address lender; // who accept the exchange
        uint256 deadline;
        int amount;
        int decimals;
        string token; // Only ADA for now
        uint256 refToken; // token from Cardano to track other side status
        string borrowerAddr; // Cardano address to send the requested amount of token (Only ADA for now)
        string lenderAddr; // Cardano address to pay the debt for the token (Only ADA for now)
        Fee fee;
    }

    enum State {
        UNKNOWN,
        LOCKED,
        WAITING_PAYMENT,
        DEBT_PAID
    }

    enum OracleRequestType {
        UNKNOWN,
        BORROW_CHECK,
        PAY_DEBT_CHECK,
        LENDER_CLAIM_CHECK,
        BORROWER_CLAIM_CHECK
    }

    struct OracleRequest {
        OracleRequestType _type;
        address _contract;
        uint256 tokenId;
        address lender;
        string lenderAddr;
    }

    struct RequestConfig {
        string source;
        uint64 subscriptionId;
        uint8 donHostedSecretsSlotID;
        uint64 donHostedSecretsVersion;
        string[] args;
        bytes[] bytesArgs;
        uint32 gasLimit;
        bytes32 donID;
    }

    constructor(
        address router,
        bytes32 sourceHash, 
        uint64 subscriptionId,
        bytes32 donID
        ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        _sourceHash = sourceHash;
        _subscriptionId = subscriptionId;
        _donID = donID;
        tokenCount = 0;
    }

    /**
     * @notice Function callback when tokens are sent/locked into the SC.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        address _contract = msg.sender;
        require(
            states[_contract][tokenId] == State.UNKNOWN,
            "Token already in use"
        );

        tokenCount += 1;
        tokens[from][_contract][tokenId] = _buildTokenInfo(
            _getTokenInfo(from, _contract, tokenId),
            data
        );
        states[_contract][tokenId] = State.LOCKED;
        owners[_contract][tokenId] = from;

        return this.onERC721Received.selector;
    }

    // If we want to make this function cost effective using chainlink functions
    // We should consider make it payable and request an amount equivalent to the LINK cost for calling chainlink plus our fees
    function borrowToken(
        string memory source,
        address _contract,
        uint256 tokenId,
        string memory lenderAddr,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion
    ) public {
        require(_contract != address(0), "Invalid token collection");
        address owner = owners[_contract][tokenId];
        Info memory info = tokens[owner][_contract][tokenId];
        require(info.lender == address(0), "There is a lender for this token already");
        address lender = msg.sender; // sender is the lender

        State status = states[_contract][tokenId];
        if (status == State.LOCKED) {
            uint256 refToken = info.refToken;
            (string[] memory args, uint32 gasLimit) = _buildOracleRequestParams(refToken, "borrow_check");
            bytes32 requestId = _sendOracleRequest(
                source, 
                _subscriptionId, 
                donHostedSecretsSlotID, 
                donHostedSecretsVersion,
                args, 
                gasLimit, 
                _donID
            );
            OracleRequest memory oracleRequest;
            oracleRequest._type = OracleRequestType.BORROW_CHECK;
            oracleRequest._contract = _contract;
            oracleRequest.tokenId = tokenId;
            oracleRequest.lender = lender;
            oracleRequest.lenderAddr = lenderAddr;

            oracleRequests[requestId] = oracleRequest;

            // address owner = owners[_contract][tokenId];
            // states[_contract][tokenId] = State.WAITING_PAYMENT;
            // tokens[owner][_contract][tokenId].lender = lender;
        } else {
            revert UnexpectedBorrowToken(tokenId, status);
        }
    }

    function _buildOracleRequestParams(
        uint256 refToken,
        string memory action
        ) internal pure returns (string[] memory, uint32) {
            string[] memory args = new string[](2);
            args[0] = action;
            args[1] = refToken.toString();
            uint32 gasLimit = 300000;
            return (args, gasLimit);
    }

    // If we want to make this function cost effective using chainlink functions
    // We should consider make it payable and request an amount equivalent to the LINK cost for calling chainlink plus our fees
    function payTokenDebt(
        string memory source,
        address _contract, 
        uint256 tokenId, 
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion
    ) public {
        address owner = owners[_contract][tokenId];
        require(msg.sender == owner, "Only token owner (borrower) can paid token debt");

        State status = states[_contract][tokenId];
        Info storage info = _getTokenInfo(owner, _contract, tokenId);
        if (
            status == State.WAITING_PAYMENT && block.timestamp <= info.deadline
        ) {
            uint256 refToken = tokens[owner][_contract][tokenId].refToken;
            (string[] memory args, uint32 gasLimit) = _buildOracleRequestParams(refToken, "pay_debt_check");
            bytes32 requestId = _sendOracleRequest(
                source, 
                _subscriptionId, 
                donHostedSecretsSlotID, 
                donHostedSecretsVersion,
                args, 
                gasLimit, 
                _donID
            );
            OracleRequest memory oracleRequest;
            oracleRequest._type = OracleRequestType.PAY_DEBT_CHECK;
            oracleRequest._contract = _contract;
            oracleRequest.tokenId = tokenId;

            oracleRequests[requestId] = oracleRequest;

            // states[_contract][tokenId] = State.DEBT_PAID;
        } else {
            revert UnexpectedPaidTokenDebt(tokenId, status);
        }
    }

    function claimToken(address _contract, uint256 tokenId) public {
        require(
            _contract != address(0),
            "Invalid token collection"
        );

        State status = states[_contract][tokenId];
        address owner = owners[_contract][tokenId];
        Info storage info = _getTokenInfo(owner, _contract, tokenId);
        if (status == State.LOCKED || status == State.DEBT_PAID) {
            // token wasn't borrowed or debt have been paid on time
            require(
                msg.sender == owner,
                "Only owner can claim token locked or paid"
            );

            _safeTransferFrom(_contract, address(this), owner, tokenId);
            _deleteToken(_contract, tokenId);
        } else if (
            status == State.WAITING_PAYMENT &&
            (info.deadline != 0 && block.timestamp > info.deadline)
        ) {
            require(
                msg.sender == info.lender,
                "Only lender can claim token after deadline"
            );

            _safeTransferFrom(_contract, address(this), info.lender, tokenId);
            _deleteToken(_contract, tokenId);
        } else {
            revert UnexpectedClaimToken(tokenId);
        }
    }

    /**
     * @notice Chainlink oracle request callback 
     * @param requestId The request ID, returned by _sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        OracleRequest memory request = oracleRequests[requestId];
        if (request._type == OracleRequestType.UNKNOWN) {
            revert UnexpectedRequestID(requestId);  
        }
        else {
            if (request._type == OracleRequestType.BORROW_CHECK) {
                (string memory borrower, int loan, int fee_n, int fee_d) = abi.decode(
                    response,
                    (string, int, int, int)
                );
                console.log("Cardano response borrower: %o", borrower);
                console.log("Cardano response loan: %o", uint256(loan));

                
                address _contract = request._contract;
                uint256 tokenId = request.tokenId;

                address owner = owners[_contract][tokenId];
                Info memory info = tokens[owner][_contract][tokenId];

                if (stringEquals(info.borrowerAddr, borrower) && info.amount == loan && info.fee.n == fee_n && info.fee.d == fee_d) {
                    states[_contract][tokenId] = State.WAITING_PAYMENT;
                    tokens[owner][_contract][tokenId].lender = request.lender;
                    tokens[owner][_contract][tokenId].lenderAddr = request.lenderAddr;
                    emit FulfillResponse(requestId, request._type, response, err);
                }
                delete oracleRequests[requestId];
            }
            else if (request._type == OracleRequestType.PAY_DEBT_CHECK) {
                (string memory lender, int debt) = abi.decode(
                    response,
                    (string, int)
                );
                console.log("Cardano response lender: %o", lender);
                console.log("Cardano response debt: %o", uint256(debt));

                address _contract = request._contract;
                uint256 tokenId = request.tokenId;

                address owner = owners[_contract][tokenId];
                Info memory info = tokens[owner][_contract][tokenId];

                if (stringEquals(info.lenderAddr, lender) && info.amount == debt) {
                    states[_contract][tokenId] = State.DEBT_PAID;
                    emit FulfillResponse(requestId, request._type, response, err);
                }
                delete oracleRequests[requestId];
            }
            else {
                delete oracleRequests[requestId];
                revert UnexpectedRequestID(requestId);  
            }
        }
       
    }


    function _deleteToken(address _contract, uint256 tokenId) internal {
        address owner = owners[_contract][tokenId];
        delete owners[_contract][tokenId];
        delete states[_contract][tokenId];
        delete tokens[owner][_contract][tokenId];
    }

    function _buildTokenInfo(
        Info storage info,
        bytes calldata data
    ) internal returns (Info storage) {
        (string memory borrowerAddr, uint256 deadline, int amount, string memory currency, int fee_n, int fee_d) = abi.decode(
            data,
            (string, uint256, int, string, int, int)
        );
        require(
            stringEquals(currency, "ADA"),
            "Only ADA currency supported"
        );
        require(amount >= 1_000_000, "Minimun 1 ADA to be lended");
        require(deadline >= 86_400, "Minimum 1 day deadline");
        info.deadline = block.timestamp + deadline;
        info.amount = amount;
        info.decimals = 1_000_000;
        info.token = currency;
        info.refToken = tokenCount;
        info.borrowerAddr = borrowerAddr;
        info.fee = Fee({ n: fee_n, d: fee_d });
        return info;
    }

    // *********************** BEGINS VIEWS *****************************************
    function getToken(
        address owner,
        address _contract,
        uint256 tokenId
    ) public view returns (Info memory, State) {
        return (tokens[owner][_contract][tokenId], states[_contract][tokenId]);
    }

    function getTokenOwner(
        address _contract,
        uint256 tokenId
    ) public view returns (address) {
        return owners[_contract][tokenId];
    }

    function getSourceHash() public view returns (bytes32) {
        return _sourceHash;   
    }

    function getSusbcriptionId() public view returns (uint64) {
        return _subscriptionId;
    } 

    function getDonId() public view returns (bytes32) {
        return _donID;
    }

    function getTokenCount() public view returns (uint256) {
        return tokenCount;
    }

    function _getTokenInfo(
        address owner,
        address _contract,
        uint256 tokenId
    ) internal view returns (Info storage) {
        return tokens[owner][_contract][tokenId];
    }

    function _getOracleRequestType(
        string memory requestType
    ) internal pure returns (OracleRequestType oracleRequest) {
        if (stringEquals(requestType, "borrow_check")) {
            return OracleRequestType.BORROW_CHECK;
        } 
        else if (stringEquals(requestType, "pay_debt_check")) {
            return OracleRequestType.PAY_DEBT_CHECK;
        }
        else if (stringEquals(requestType, "lender_claim_check")) {
            return OracleRequestType.LENDER_CLAIM_CHECK;
        }
        else if (stringEquals(requestType, "borrower_claim_check")) {
            return OracleRequestType.BORROWER_CLAIM_CHECK;
        } else {
            return OracleRequestType.UNKNOWN;
        }
    }

    function stringEquals(string memory a, string memory b) public pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function validSource(string memory source) public view returns (bool) {
        return keccak256(abi.encodePacked(source)) == _sourceHash;
    }

    // *********************** ENDS VIEWS *****************************************

    function _safeTransferFrom(
        address _contract,
        address from,
        address to,
        uint256 tokenId
    ) internal {
        IERC721(_contract).safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @notice Send a simple request
     * @param source Javascript source code
     * @param donHostedSecretsSlotID Don hosted secrets slotId
     * @param donHostedSecretsVersion Don hosted secrets version
     * @param args List of arguments accessible from within the source code
     * @param subscriptionId Billing ID
     */
    function _sendOracleRequest(
        string memory source,
        uint64 subscriptionId,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        // bytes[] memory bytesArgs,
        uint32 gasLimit,
        bytes32 donID
    ) internal returns (bytes32 requestId) {
        require(args.length > 0, "Missing OracleRequestType argument");
         OracleRequestType oracleRequestType = _getOracleRequestType(args[0]);
        require(oracleRequestType != OracleRequestType.UNKNOWN, "Invalid OracleRequestType");

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        // if (encryptedSecretsUrls.length > 0)
        //     req.addSecretsReference(encryptedSecretsUrls);
        if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(
                donHostedSecretsSlotID,
                donHostedSecretsVersion
            );
        }
        if (args.length > 0) req.setArgs(args);
        // if (bytesArgs.length > 0) req.setBytesArgs(bytesArgs);
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );
        return requestId;
    }

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

    function stringToAddress(string memory _address) public pure returns (address) {
        return address(bytes20(bytes32(uint256(keccak256(abi.encodePacked(_address))))));
    }
}
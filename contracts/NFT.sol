// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// Remove this on production
import "hardhat/console.sol";

contract NFT is ERC721 {
    constructor() ERC721("NonFunToken", "NFT") {}

    // Allows minting of a new NFT 
    function mintCollectionNFT(address collector, uint256 tokenId) public {
        _safeMint(collector, tokenId); 
    }
}
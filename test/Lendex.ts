import {
    time,
    loadFixture,
    mine
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lendex", () => {
    const emptyAddress = "0x0000000000000000000000000000000000000000";
    const emptyInfo = [
        emptyAddress, // lender
        0,            // deadline
        0,            // amount
        0,            // decimals
        ''            // token name (ADA)
    ];

    const Status = {
        UNKNOWN: 0,
        LOCKED: 1,
        WAITING_PAYMENT: 2,
        DEBT_PAID: 3
    }

    const abiCoder = new ethers.AbiCoder();

    async function deployLendexFixture() {
        const [owner, borrower, lender] = await ethers.getSigners();

        const Lendex = await ethers.getContractFactory("Lendex", owner);
        const lendex = await Lendex.deploy();

        return { lendex, owner, borrower, lender };
    }

    async function deployNFTFixture() {
        const [owner] = await ethers.getSigners();

        const NFT = await ethers.getContractFactory("NFT", owner);
        const nft = await NFT.deploy();

        return { nft };
    }

    function getTokenId(collection: string, tokenId = 123) {
        const encodedCollection = abiCoder.encode(['address'], [collection]);
        const encodedTokenId = abiCoder.encode(['uint256'], [tokenId]);

        // Add a dot as a separate byte sequence
        const dotBytes = ethers.toUtf8Bytes('.');

        // Concatenate the encoded values and the dot
        const concatenatedBytes = ethers.concat([encodedCollection, dotBytes, encodedTokenId]);

        return concatenatedBytes;
    }

    describe("Deployment", function () {

        it("Should be no borrowers", async () => {
            // Arrange
            const { lendex, borrower } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;

            // Act
            const address = await lendex.getTokenOwner(collection, tokenId);
            const info = await lendex.getToken(borrower, collection, tokenId);

            // Assert
            expect(address).to.equal(emptyAddress);
            expect(info).to.deep.equal([emptyInfo, 0]);
        });
    });

    describe("Lock", function () {
        it("Should lock token", async () => {
            // Arrange
            const { lendex, borrower } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';
            const info = [
                emptyAddress,
                0,
                amount,
                1000000n,
                currency
            ];

            // Act
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
            const latestTime = await time.latest();
            info[1] = deadline + latestTime;

            const tokenOwner = await nft.ownerOf(tokenId);
            const lendexOwner = await lendex.getTokenOwner(collection, tokenId);
            const [tokenInfo, status] = await lendex.getToken(borrower.address, collection, tokenId);


            // Assert
            expect(tokenOwner).to.equal(lendex.target);
            expect(lendexOwner).to.equal(borrower.address);
            expect(status).to.equal(Status.LOCKED);
            expect(tokenInfo).to.deep.equal(info);
        });

        it("Should revert lock token if currency isn't ADA", async () => {
            // Arrange
            const { lendex, borrower } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'BTC';

            // Act
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // Assert
            await expect(nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data)).to.be.revertedWith(
                "Only ADA currency supported"
            );
        });

        it("Should revert lock token if currency amount is less than 1 ADA", async () => {
            // Arrange
            const { lendex, borrower } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 500_000;
            const currency = 'ADA';

            // Act
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // Assert
            await expect(nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data)).to.be.revertedWith(
                "Minimun 1 ADA to be lended"
            );
        });

        it("Should revert lock token if deadline is less than 1 day", async () => {
            // Arrange
            const { lendex, borrower } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const tokenId = 123;
            const deadline = 400;
            const amount = 1_000_000;
            const currency = 'ADA';

            // Act
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // Assert
            await expect(nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data)).to.be.revertedWith(
                "Minimum 1 day deadline"
            );
        });
    });

    describe("Borrow", function () {
        it("Should borrow token", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';
            const info = [
                lender.address,
                0,
                amount,
                1000000n,
                currency
            ];

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
            const latestTime = await time.latest();
            info[1] = deadline + latestTime;

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            const tokenOwner = await nft.ownerOf(tokenId);
            const lendexOwner = await lendex.getTokenOwner(collection, tokenId);
            const [tokenInfo, status] = await lendex.getToken(borrower.address, collection, tokenId);

            // Assert
            expect(tokenOwner).to.equal(lendex.target);
            expect(lendexOwner).to.equal(borrower.address);
            expect(status).to.equal(Status.WAITING_PAYMENT);
            expect(tokenInfo).to.deep.equal(info);
        });

        it("Should revert borrow token not locked (non exists)", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);


            // Assert
            await expect(lendex.borrowToken(collection, 0, lender)).to.be.revertedWithCustomError(
                lendex,
                'UnexpectedBorrowToken'
            );

        });

        it("Should revert borrow token not locked (already claimed)", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // unlock token
            await lendex.connect(borrower).claimToken(collection, tokenId);

            // Assert
            await expect(lendex.borrowToken(collection, tokenId, lender)).to.be.revertedWithCustomError(
                lendex,
                'UnexpectedBorrowToken'
            );

        });

        it("Should revert borrow token not locked (already borrowed)", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // Assert
            await expect(lendex.borrowToken(collection, tokenId, lender)).to.be.revertedWithCustomError(
                lendex,
                'UnexpectedBorrowToken'
            );

        });
    });

    describe("Pay Debt", function () {
        it("Should pay token debt", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';
            const info = [
                lender.address,
                0,
                amount,
                1000000n,
                currency
            ];

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
            const latestTime = await time.latest();
            info[1] = deadline + latestTime;

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // pay token debt
            await lendex.connect(borrower).payTokenDebt(collection, tokenId);

            const tokenOwner = await nft.ownerOf(tokenId);
            const lendexOwner = await lendex.getTokenOwner(collection, tokenId);
            const [tokenInfo, status] = await lendex.getToken(borrower.address, collection, tokenId);

            // Assert
            expect(tokenOwner).to.equal(lendex.target);
            expect(lendexOwner).to.equal(borrower.address);
            expect(status).to.equal(Status.DEBT_PAID);
            expect(tokenInfo).to.deep.equal(info);
        });

        it("Should revert pay token debt if not owner", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);


            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // Assert
            await expect(lendex.connect(lender).payTokenDebt(collection, tokenId)).to.be.rejectedWith(
                "Only token owner can paid token debt"
            );
            
        });

        it("Should revert borrower pay token debt after deadline", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
            const latestTime = await time.latest();
            const unlockTime = deadline + latestTime + 1;

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // Transactions are sent using the first signer by default
            await time.increaseTo(unlockTime);

            // Assert
            await expect(lendex.connect(borrower).payTokenDebt(collection, tokenId)).to.be.revertedWithCustomError(
                lendex,
                "UnexpectedPaidTokenDebt"
            );
            
        });

        it("Should revert borrower pay token debt before borrow", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // Assert
            await expect(lendex.connect(borrower).payTokenDebt(collection, tokenId)).to.be.revertedWithCustomError(
                lendex,
                "UnexpectedPaidTokenDebt"
            );
            
        });

    });

    describe("Claim", function () {
        it("Should borrower claim token", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // pay token debt
            await lendex.connect(borrower).payTokenDebt(collection, tokenId);

            // claim token
            await lendex.connect(borrower).claimToken(collection, tokenId);

            const tokenOwner = await nft.ownerOf(tokenId);
            const lendexOwner = await lendex.getTokenOwner(collection, tokenId);
            const info = await lendex.getToken(borrower.address, collection, tokenId);

            // Assert
            expect(tokenOwner).to.equal(borrower.address);
            expect(lendexOwner).to.equal(emptyAddress);
            expect(info).to.deep.equal([emptyInfo, 0]);
        });

        it("Should lender claim token", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
            const latestTime = await time.latest();
            const unlockTime = deadline + latestTime + 1;

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // Transactions are sent using the first signer by default
            await time.increaseTo(unlockTime);

            // claim token
            await lendex.connect(lender).claimToken(collection, tokenId);

            const tokenOwner = await nft.ownerOf(tokenId);
            const lendexOwner = await lendex.getTokenOwner(collection, tokenId);
            const info = await lendex.getToken(borrower.address, collection, tokenId);

            // Assert
            expect(tokenOwner).to.equal(lender.address);
            expect(lendexOwner).to.equal(emptyAddress);
            expect(info).to.deep.equal([emptyInfo, 0]);
        });

        it("Should revert claim token with empty collection", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // pay token debt
            await lendex.connect(borrower).payTokenDebt(collection, tokenId);

            // Assert
            await expect(lendex.connect(borrower).claimToken(emptyAddress, tokenId)).to.be.revertedWith(
                "Only owner can claim token if not borrowed or with debt paid"
            );
        });

        it("Should revert lender claim token before deadline", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // Assert
            await expect(lendex.connect(lender).claimToken(collection, tokenId)).to.be.revertedWithCustomError(
                lendex,
                "UnexpectedClaimToken"
            );
        });

        it("Should revert lender claim token been paid", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // pay token debt
            await lendex.connect(borrower).payTokenDebt(collection, tokenId);

            // Assert
            await expect(lendex.connect(lender).claimToken(collection, tokenId)).to.revertedWith(
                "Only owner can claim token locked or paid"
            );
        });

        it("Should revert borrower claim token if debt not paid", async () => {
            // Arrange
            const { lendex, owner, borrower, lender } = await loadFixture(deployLendexFixture);
            const { nft } = await loadFixture(deployNFTFixture);
            const collection = nft.target;
            const tokenId = 123;
            const deadline = 86_400;
            const amount = 5_000_000;
            const currency = 'ADA';

            // Act

            // mint token
            await nft.mintCollectionNFT(borrower, tokenId);
            const data = abiCoder.encode(["uint256", "int", "string"], [deadline, amount, currency]);

            // lock token
            await nft.connect(borrower)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
            const latestTime = await time.latest();
            const unlockTime = deadline + latestTime + 1;

            // borrow token
            await lendex.borrowToken(collection, tokenId, lender);

            // Transactions are sent using the first signer by default
            await time.increaseTo(unlockTime);

            // Assert
            await expect(lendex.connect(borrower).claimToken(collection, tokenId)).to.be.revertedWith(
                "Only lender can claim token after deadline"
            );
        });
    });
})
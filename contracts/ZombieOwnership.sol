// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ZombieBattle.sol";
import "./ERC721.sol";

contract ZombieOwnership is ZombieBattle, ERC721 {
    using SafeMath for uint256;

    mapping(uint256 => address) zombieApprovals;

    function balanceOf(address _owner) public view override returns (uint256) {
        return ownerZombieCount[_owner];
    }

    function ownerOf(uint256 _tokenId) public view override returns (address) {
        return zombieToOwner[_tokenId];
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _tokenId
    ) private {
        ownerZombieCount[_to] = ownerZombieCount[_to].add(1);
        ownerZombieCount[_from] = ownerZombieCount[_from].sub(1);
        zombieToOwner[_tokenId] = _to;

        emit Transfer(_from, _to, _tokenId);
    }

    function transfer(address _to, uint256 _tokenId) public override onlyOwnerOf(_tokenId) {
        _transfer(msg.sender, _to, _tokenId);
    }

    function approve(address _to, uint256 _tokenId) public override onlyOwnerOf(_tokenId) {
        zombieApprovals[_tokenId] = _to;
        emit Approval(msg.sender, _to, _tokenId);
    }

    function takeOwnership(uint256 _tokenId) public override {
        require(zombieApprovals[_tokenId] == msg.sender, "no approval");

        address owner = ownerOf(_tokenId);
        _transfer(owner, msg.sender, _tokenId);
    }
}

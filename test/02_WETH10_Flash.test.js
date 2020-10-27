const WETH10 = artifacts.require('WETH10')
const TestFlashMinter = artifacts.require('TestFlashMinter')

const { BN, expectRevert } = require('@openzeppelin/test-helpers')
require('chai').use(require('chai-as-promised')).should()

const MAX = "5192296858534827628530496329220095"

contract('WETH10 - Flash Minting', (accounts) => {
  const [deployer, user1, user2] = accounts
  let weth
  let flash

  beforeEach(async () => {
    weth = await WETH10.new({ from: deployer })
    flash = await TestFlashMinter.new({ from: deployer })
  })

  it('should do a simple flash mint', async () => {
    await flash.flashMint(weth.address, 1, { from: user1 })

    const balanceAfter = await weth.balanceOf(user1)
    balanceAfter.toString().should.equal(new BN('0').toString())
    const flashBalance = await flash.flashBalance()
    flashBalance.toString().should.equal(new BN('1').toString())
    const flashValue = await flash.flashValue()
    flashValue.toString().should.equal(new BN('1').toString())
    const flashUser = await flash.flashUser()
    flashUser.toString().should.equal(user1)
  })

  it('cannot flash mint beyond the total supply limit', async () => {
    await weth.deposit({ from: user1, value: '1' })
    await expectRevert(flash.flashMint(weth.address, MAX, { from: user1 }), 'WETH::flashMint: supply limit exceeded')
  })

  it('should not steal a flash mint', async () => {
    await expectRevert(
      flash.flashMintAndSteal(weth.address, 1, { from: deployer }),
      'WETH::flashMint: supply not restored'
    )
  })

  it('should do two nested flash loans', async () => {
    await flash.flashMintAndReenter(weth.address, 1, { from: deployer })

    const flashBalance = await flash.flashBalance()
    flashBalance.toString().should.equal('3')
  })

  describe('with a non-zero WETH supply', () => {
    beforeEach(async () => {
      await weth.deposit({ from: deployer, value: 10 })
    })

    it('should flash mint, withdraw & deposit', async () => {
      await flash.flashMintAndWithdraw(weth.address, 1, { from: deployer })

      const flashBalance = await flash.flashBalance()
      flashBalance.toString().should.equal('1')
    })
  })
})

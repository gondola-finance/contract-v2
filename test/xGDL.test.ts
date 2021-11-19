import { ethers } from "hardhat"
import { expect } from "chai"
import { BigNumber, Signer, Wallet } from "ethers"
import { GenericERC20 } from "../build/typechain/GenericERC20"
import { deployContract } from "ethereum-waffle/dist/esm/deployContract"

describe("xGDL", function () {
  before(async function () {
    this.GondolaToken = await ethers.getContractFactory("GondolaToken")
    this.GondolaBar = await ethers.getContractFactory("XGDL")
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.dave = this.signers[3]
    this.eric = this.signers[4]
    this.fiona = this.signers[5]
  })

  beforeEach(async function () {
    // this.gdl = await this.GondolaToken.deploy("50000000000000000000")
    const erc20Factory = await ethers.getContractFactory("GenericERC20")
    this.gdl = (await erc20Factory.deploy(
      "dummy",
      "dummy",
      "18",
    )) as GenericERC20
    this.bar = await this.GondolaBar.deploy(this.gdl.address, "300")
    this.gdl.mint(this.alice.address, "10000")
    this.gdl.mint(this.bob.address, "10000")
    this.gdl.mint(this.carol.address, "10000")
  })

  it("should not allow enter if not enough approve", async function () {
    await expect(this.bar.enter("10000")).to.be.revertedWith(
      "ERC20: transfer amount exceeds allowance",
    )
    await this.gdl.approve(this.bar.address, "5000")
    await expect(this.bar.enter("10000")).to.be.revertedWith(
      "ERC20: transfer amount exceeds allowance",
    )
    await this.gdl.approve(this.bar.address, "10000")
    await this.bar.enter("10000")
    expect(await this.bar.balanceOf(this.alice.address)).to.equal("10000")
  })

  it("should not allow withraw more than what you have", async function () {
    await this.gdl.approve(this.bar.address, "10000")
    await this.bar.enter("10000")
    await expect(this.bar.leave("20000")).to.be.revertedWith(
      "ERC20: burn amount exceeds balance",
    )
  })

  it("should return same amount when the pool is empty", async function () {
    await this.gdl.approve(this.bar.address, "10000")
    await this.bar.enter("10000")
    expect(await this.bar.getRatio("100")).to.equal("100")
  })

  it("should work with withdrawal fee", async function () {
    await this.gdl.approve(this.bar.address, "10000")
    // Alice enter with 2000 shares
    await this.bar.enter("2000")
    // current ratio shd be equal to 1:1
    expect(await this.bar.getRatio("100")).to.equal("100")
    expect(await this.bar.balanceOf(this.alice.address)).to.equal("2000")
    // Alice leave with 1000 shares, 3% of the shares = 60 will be remain inside the pool as a withdrawal fee
    await this.bar.leave("1000")
    // 30 shares is remain in the bar. The ratio shd become 1:1.03
    expect(await this.bar.getRatio("100")).to.equal("103")
    // 8000 + 970 shares recevied
    expect(await this.gdl.balanceOf(this.alice.address)).to.equal("8970")
    expect(await this.bar.balanceOf(this.alice.address)).to.equal("1000")
    expect(await this.gdl.balanceOf(this.bar.address)).to.equal("1030")
  })
  it("should work with more than one participant", async function () {
    await this.gdl.approve(this.bar.address, "10000")
    await this.gdl
      .connect(this.bob)
      .approve(this.bar.address, "10000", { from: this.bob.address })

    // Alice enters and get 20 shares.
    await this.bar.enter("2000")
    // Bob enters and gets 10 shares.
    await this.bar.connect(this.bob).enter("1000", { from: this.bob.address })

    expect(await this.bar.balanceOf(this.alice.address)).to.equal("2000")
    expect(await this.bar.balanceOf(this.bob.address)).to.equal("1000")
    expect(await this.gdl.balanceOf(this.bar.address)).to.equal("3000")

    // GondolaBar get 20 more GDLs from an external source.
    await this.gdl
      .connect(this.carol)
      .transfer(this.bar.address, "2000", { from: this.carol.address })
    await this.bar.enter("1000")
    expect(await this.bar.balanceOf(this.alice.address)).to.equal("2600")
    expect(await this.bar.balanceOf(this.bob.address)).to.equal("1000")
    await this.bar.connect(this.bob).leave("500", { from: this.bob.address })
    expect(await this.bar.balanceOf(this.alice.address)).to.equal("2600")
    expect(await this.bar.balanceOf(this.bob.address)).to.equal("500")
    expect(await this.gdl.balanceOf(this.bar.address)).to.equal("5191")
    expect(await this.gdl.balanceOf(this.alice.address)).to.equal("7000")
    expect(await this.gdl.balanceOf(this.bob.address)).to.equal("9809")
  })

  it("should return 0 when the pool is empty", async function () {
    expect(await this.bar.getRatio("2000")).to.equal("0")
    await this.gdl.approve(this.bar.address, "10000")
    await this.bar.enter("2000")
    await this.gdl
      .connect(this.carol)
      .transfer(this.bar.address, "2000", { from: this.carol.address })
    expect(await this.bar.getRatio("2000")).to.equal("4000")
    await this.bar.leave("1000")
    expect(await this.bar.getRatio("2000")).to.equal("4120")
  })

  it("final test", async function () {
    expect(await this.bar.getRatio("2000")).to.equal("0")
    // alice approve for 10000 shares
    await this.gdl.approve(this.bar.address, "10000")
    // bob approve for 10000 shares
    await this.gdl
      .connect(this.bob)
      .approve(this.bar.address, "10000", { from: this.bob.address })
    // carol approve for 10000 shares
    await this.gdl
      .connect(this.carol)
      .approve(this.bar.address, "10000", { from: this.carol.address })
    // dave approve for 10000 shares
    await this.gdl
      .connect(this.dave)
      .approve(this.bar.address, "10000", { from: this.dave.address })
    // eric approve for 10000 shares
    await this.gdl
      .connect(this.eric)
      .approve(this.bar.address, "10000", { from: this.eric.address })
    // fiona approve for 10000 shares
    await this.gdl
      .connect(this.fiona)
      .approve(this.bar.address, "10000", { from: this.fiona.address })

    // alice enter 2000
    await this.bar.enter("2000")
    // expect 1:1
    expect(await this.bar.getRatio("2000")).to.equal("2000")
    // balance of XGDL of Alice = 2000
    expect(await this.bar.balanceOf(this.alice.address)).to.equal("2000")
    // balance of GDL of Alice = 8000
    expect(await this.gdl.balanceOf(this.alice.address)).to.equal("8000")
    // balance of GDL in xGDL
    expect(await this.gdl.balanceOf(this.bar.address)).to.equal("2000")

    // Bob enter 1000
    await this.bar.connect(this.bob).enter("1000", { from: this.bob.address })
    // balance of xGDL of Bob: 1000
    expect(await this.bar.balanceOf(this.bob.address)).to.equal("1000")
    // balance of GDL of Bob = 9000
    expect(await this.gdl.balanceOf(this.bob.address)).to.equal("9000")

    // Alice left 1000
    await this.bar.leave("1000")
    // gdl left in bar = 2030
    expect(await this.gdl.balanceOf(this.bar.address)).to.equal("2030")
    expect(await this.bar.totalSupply()).to.equal("2000")
    expect(await this.bar.getRatio("1000")).to.equal("1015")

    // Bob left 500
    await this.bar.connect(this.bob).leave("500", { from: this.bob.address })
    expect(await this.bar.totalSupply()).to.equal("1500")
    expect(await this.gdl.balanceOf(this.bar.address)).to.equal("1538")
    expect(await this.bar.getRatio("1000")).to.equal("1025")

    // Carol enter 1000
    await this.bar
      .connect(this.carol)
      .enter("1000", { from: this.carol.address })
    // now 975XGDL=999GDL
    expect(await this.bar.getRatio("975")).to.equal("999")
    expect(await this.bar.balanceOf(this.carol.address)).to.equal("975")

    // Bob left 500
    expect(await this.gdl.balanceOf(this.bob.address)).to.equal("9492")
    expect(await this.bar.getRatio("500")).to.equal("512")
    await this.bar.connect(this.bob).leave("500", { from: this.bob.address })
    expect(await this.gdl.balanceOf(this.bob.address)).to.equal("9989")
    expect(await this.bar.getRatio("500")).to.equal("516")
    await this.gdl
      .connect(this.carol)
      .transfer(this.bar.address, "1000", { from: this.carol.address })
    expect(await this.bar.getRatio("500")).to.equal("769")

    await this.bar.leave("1000")
    expect(await this.bar.getRatio("500")).to.equal("793")
  })
})

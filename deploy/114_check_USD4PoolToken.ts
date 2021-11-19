import { BigNumber } from "ethers"
import { CHAIN_ID } from "../utils/network"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const USD4_TOKENS_ARGS: { [token: string]: any[] } = {
  USDTE: ["Tether USD", "USDT.e", "6"],
  TSD: ["TSD Stablecoin", "TSD", "18"],
  AVAI: ["Avalanche's DAI", "AVAI", "18"],
  XUSD: ["xDoller Stablecoin", "xUSD", "18"],
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  for (const token in USD4_TOKENS_ARGS) {
    await deploy(token, {
      from: deployer,
      log: true,
      contract: "GenericERC20",
      args: USD4_TOKENS_ARGS[token],
      skipIfAlreadyDeployed: true,
    })
    // If it's on hardhat, mint test tokens
    if ((await getChainId()) == CHAIN_ID.AVA_FUJI) {
      const decimals = USD4_TOKENS_ARGS[token][2]
      await execute(
        token,
        { from: deployer, log: true },
        "mint",
        deployer,
        BigNumber.from(10).pow(decimals).mul(10000),
      )
    }
  }
}
export default func
func.tags = ["USD4PoolTokens"]

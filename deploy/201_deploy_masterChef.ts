import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  // for testing on FUJI
  if ((await getChainId()) == CHAIN_ID.AVA_MAINNET) {
    return
  }
  let tokenAddress = (await get("GondolaToken")).address

  await deploy("MasterChef", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [tokenAddress],
  })
}

export default func
func.tags = ["MasterChef"]
func.dependencies = ["GondolaToken"]

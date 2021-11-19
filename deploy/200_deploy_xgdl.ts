import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, deploy, get } = deployments
  const { deployer } = await getNamedAccounts()
  const gdl = await deployments.get("GondolaToken")
  const WITHDRAWAL_FEE = 300

  if((await getChainId()) == CHAIN_ID.AVA_MAINNET) {
    return
  }
  await deploy("XGDL", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [gdl.address, WITHDRAWAL_FEE],
  })

  // await execute("GondolaToken", { from: deployer, log: true }, "distribute", deployer, BigNumber.from(reserve).mul(BigNumber.from(10).pow(18)))
}
export default func
func.tags = []

import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const gondolaMIMPool = await getOrNull("GondolaMIMPool")
  if (gondolaMIMPool) {
    log(`reusing "GondolaMIMPool" at ${gondolaMIMPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDTE")).address,
      (await get("MIM")).address,
    ]
    const TOKEN_DECIMALS = [6, 18]
    const LP_TOKEN_NAME = "Gondola USDT.e/MIM"
    const LP_TOKEN_SYMBOL = "gondolaMIM"
    const INITIAL_A = 100
    const SWAP_FEE = 2e6
    const ADMIN_FEE = 2e6

    const receipt = await execute(
      "SwapDeployer",
      { from: deployer, log: true },
      "deploy",
      (
        await get("SwapFlashLoan")
      ).address,
      TOKEN_ADDRESSES,
      TOKEN_DECIMALS,
      LP_TOKEN_NAME,
      LP_TOKEN_SYMBOL,
      INITIAL_A,
      SWAP_FEE,
      ADMIN_FEE,
      (
        await get("LPToken")
      ).address,
    )

    const newPoolEvent = receipt?.events?.find(
      (e: any) => e["event"] == "NewSwapPool",
    )
    const mimSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed MIM pool clone (targeting "SwapFlashLoan") at ${mimSwapAddress}`,
    )
    await save("GondolaMIMPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: mimSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaMIMPool", "swapStorage")).lpToken
  log(`MIM pool LP Token at ${lpTokenAddress}`)

  await save("GondolaMIMPoolLPToken", {
    abi: (await get("USDT")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["MIMPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "MIMPoolTokens",
]

import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const gondolaUSDPool = await getOrNull("GondolaUSDPool")
  if (gondolaUSDPool) {
    log(`reusing "GondolaUSDPool" at ${gondolaUSDPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDTE")).address,
      (await get("USDCE")).address,
      (await get("DAIE")).address,
    ]
    const TOKEN_DECIMALS = [6, 6, 18]
    const LP_TOKEN_NAME = "Gondola USD"
    const LP_TOKEN_SYMBOL = "gondolaUSD"
    const INITIAL_A = 60
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
    const usdSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed USD pool clone (targeting "SwapFlashLoan") at ${usdSwapAddress}`,
    )
    await save("GondolaUSDPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usdSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaUSDPool", "swapStorage")).lpToken
  log(`USD pool LP Token at ${lpTokenAddress}`)

  await save("GondolaUSDPoolLPToken", {
    abi: (await get("USDT")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["USDPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USDPoolTokens",
]

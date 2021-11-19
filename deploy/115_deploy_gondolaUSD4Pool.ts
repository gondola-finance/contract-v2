import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const gondolaUSD4Pool = await getOrNull("GondolaUSD4Pool")
  if (gondolaUSD4Pool) {
    log(`reusing "GondolaUSD4Pool" at ${gondolaUSD4Pool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDTE")).address,
      (await get("TSD")).address,
      (await get("AVAI")).address,
      (await get("XUSD")).address,
    ]
    const TOKEN_DECIMALS = [6, 18, 18, 18]
    const LP_TOKEN_NAME = "Gondola USD4"
    const LP_TOKEN_SYMBOL = "gondolaUSD4"
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
    const usd4SwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed USD4 pool clone (targeting "SwapFlashLoan") at ${usd4SwapAddress}`,
    )
    await save("GondolaUSD4Pool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usd4SwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaUSD4Pool", "swapStorage")).lpToken
  log(`USD4 pool LP Token at ${lpTokenAddress}`)

  await save("GondolaUSD4PoolLPToken", {
    abi: (await get("USDT")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["USD4Pool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USD4PoolTokens",
]

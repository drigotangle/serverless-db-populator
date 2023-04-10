import ethers from 'ethers'
import moment from 'moment'
import { provider, ZERO_ADDRESS, WETH_ADDRESS, NFT_MANAGER_ADDRESS, FACTORY_ADDRESS, PINNED_PAIRS, FEE_ARR } from '../constants/index'

const FACTORY_ARTIFACT = require('../ABI/V3Factory.json');
const POOL_ARTIFACT = require('../ABI/V3Pool.json');
const ERC20_ABI = require('../ABI/ERC20.json');
const NftManager = require('../ABI/Nonfungiblepositionmanager.json');

export const tokenInstance = (address) => {
    const token = new ethers.Contract(address, ERC20_ABI, provider);
    return token;
};

export const nftManagerInstance = () => {
    const nftManager = new ethers.Contract(NFT_MANAGER_ADDRESS, NftManager.abi, provider); 
    return nftManager;
};

export const factoryInstance = () => {
    const token = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ARTIFACT.abi, provider);
    return token;
};

export const getPoolAddress = async (token0, token1, fee) => {
    try {
        const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ARTIFACT.abi, provider);
        const poolAddress = await factory.getPool(token0, token1, fee);
        return poolAddress;
    } catch (error) {
        console.log(error.message, 'for getPoolAddress');
    }
};

export const getBlockTimestamp = async (blockNumber) => {
    try {
        const block = await provider.getBlock(blockNumber);
        const timestamp = block?.timestamp;
        const formattedDate = moment.unix(timestamp ?? 0).format('YYYY-MM-DD HH:mm:ss');
        return formattedDate;
    } catch (error) {
        console.log(error, 'for getting block timestamp');
    }
};

export const sqrtPriceToPrice = (sqrtPriceX96, token0Decimals, token1Decimals) => {
    let mathPrice = Number(sqrtPriceX96) ** 2 / 2 ** 192;
    const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);
    const price = mathPrice * decimalAdjustment;
    return price;
};

export const formatPrice = (token0Address, token1Address, decimals0, decimals1, sqrtPriceX96) => {
    if(token0Address > token1Address) {
        [decimals0, decimals1] = [decimals1, decimals0];
    }
    let formatedPrice = sqrtPriceToPrice(sqrtPriceX96, decimals0, decimals1);
    if(token0Address > token1Address){
        formatedPrice = 1 / formatedPrice; 
    }
    return formatedPrice;
};

export const formatAmount = (amount, decimals) => {
    const formatedAmount = amount / (10 ** decimals);
    return formatedAmount;
};

export const choosePrice = (wethPrice = undefined, deeperPrice = undefined) => {
    if(![wethPrice, deeperPrice].includes(undefined)){
        //@ts-ignore
        return wethPrice > deeperPrice ? wethPrice : deeperPrice;
    }
    if(wethPrice === undefined && deeperPrice !== undefined){
        return deeperPrice;
    }
    if(wethPrice !== undefined && wethPrice === undefined){
        return wethPrice;
    }
};

export const getPoolData = async (poolAddress, blockNumber) => {
    try {
        const pool = new ethers.Contract(poolAddress, POOL_ARTIFACT, provider)
        const token0Address = await pool.token0()
        const token1Address = await pool.token1()
        const token0 = new ethers.Contract(token0Address, ERC20_ABI, provider)
        const token1 = new ethers.Contract(token1Address, ERC20_ABI, provider)
        const decimals0 = await token0.decimals()
        const decimals1 = await token1.decimals()
        const slot0 = await pool.slot0({blockTag: blockNumber})
        const price = formatPrice(token0Address, token1Address, decimals0, decimals1, slot0.sqrtPriceX96._hex)
        const result = { price, token0Address, token1Address, decimals0, decimals1, token1, token0 }
        return result
    } catch (error) {
        console.log(error.message, error.line, 'from getPoolData')
    }
}

export const getWethPriceAndLiquidity = async (address, blockNumber) => {
    const feesArr = [500, 3000, 10000]
    let poolsArr = []
    try {
        const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ARTIFACT.abi, provider)
        for(let i = 0; i < feesArr.length; i++){
            const fee = feesArr[i]
            const poolAddress = await factory.getPool(address, WETH_ADDRESS, fee)
            if(poolAddress !== ZERO_ADDRESS){
                const poolContract = await getPoolData(poolAddress, blockNumber)
                let price = poolContract?.price
                const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider)
                const wethBalance = await wethContract.balanceOf(poolAddress, {blockTag: blockNumber})
                poolsArr.push({
                    poolAddress: poolAddress,
                    price: price,
                    wethBalance: Number(wethBalance._hex) / (10 ** 18)
                })
            }
        }
        poolsArr.sort((a, b) => {
            return b.wethBalance - a.wethBalance
        })
        return poolsArr
    } catch (error) {
        console.log(error, 'for getWethPriceAndLiquidity')
    }
}

export const getDeeperPriceAndLiquidity = async (address, blockNumber) => {
    let poolsArr = [];
    try {
        const factory = factoryInstance();
        for (const fee of FEE_ARR) {
            for (const pinnedAddress of PINNED_PAIRS) {
                const pinnedPoolAddress = await factory.getPool(address, pinnedAddress, fee);
                if (pinnedPoolAddress !== ZERO_ADDRESS) {
                    const pinnedPool = await getPoolData(pinnedPoolAddress, blockNumber);
                    const wethPool = await getWethPriceAndLiquidity(pinnedAddress, blockNumber);
                    const wethContract = tokenInstance(WETH_ADDRESS);
                    const wethBalance = await wethContract.balanceOf(wethPool[0].poolAddress, { blockTag: blockNumber });
                    const price = pinnedPool.price * wethPool[0].price;
                    poolsArr.push({
                        poolAddress: pinnedPoolAddress,
                        price: price,
                        wethBalance: Number(wethBalance._hex) / (10 ** 18)
                    });
                }
            }
        }
        poolsArr.sort((a, b) => {
            return b.wethBalance - a.wethBalance;
        });
        return poolsArr;
    } catch (error) {
        
    }
};

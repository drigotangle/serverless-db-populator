import AWS from 'aws-sdk'

const dynamoClient = new AWS.DynamoDB.DocumentClient();

const getLastTVL = async () => {
  try {
    const params = {
      TableName: 'tvl',
    };
    const result = await dynamoClient.scan(params).promise();
    const documents = result.Items;
    if (documents.length > 0 && documents !== undefined) {
      const tvl = documents[documents.length - 1].tvl;
      if (!isNaN(tvl)) {
        return tvl;
      }
    }
    return 0;
  } catch (error) {
    console.log(error, 'for getLastTVL');
  }
};

export const insertLiquidity = async (
  blockNumber,
  eventName,
  token0Address,
  token1Address,
  value,
  symbol0,
  symbol1,
  amount0,
  amount1,
  account,
  time,
  hash,
  poolAddress
) => {
  try {
    const params = {
      TableName: 'liquidity-transactions',
      Item: {
        block: blockNumber,
        eventName: eventName,
        token0Address: token0Address,
        token1Address: token1Address,
        value: value,
        symbol0: symbol0,
        symbol1: symbol1,
        amount0: amount0,
        amount1: amount1,
        account: account,
        time: time,
        hash: hash,
        poolAddress: poolAddress,
      },
    };
    await dynamoClient.put(params).promise();
  } catch (error) {}
};

export const updateTVL = async (
  eventName,
  blockNumber,
  time,
  hash,
  sumValue,
  poolAddress
) => {
  try {
    const currentlyTVL = await getLastTVL();
    const params = {
      TableName: 'uniswap-v3-tvl',
      Item: {
        time: time,
        tvl: eventName === 'IncreaseLiquidity' ? currentlyTVL + sumValue : currentlyTVL - sumValue,
        wethToken1: true,
        blockNumber: blockNumber,
        hash: hash,
        poolAddress: poolAddress,
      },
    };
    await dynamoClient.put(params).promise();
  } catch (error) {}
};

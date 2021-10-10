require('dotenv').config()
const Web3Feature = require('web3')

// Grab env variables
const rpcUrl = process.env.RPC_URL
const privateKey = process.env.PRIVATE_KEY


// Import web3 wiith the FTM RPC 
const web3 = new Web3Feature(rpcUrl)
const wallet = web3.eth.accounts.wallet.add(privateKey)

// Smart contract address
const BNB_MINER_CONTRACT = "0x84f9d5E0B43AE00f17E50588ABf9c3447EB756b5"


// Contract ABI
const BNB_MINER_ABI = [{"constant":true,"inputs":[],"name":"ceoAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getMyMiners","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"initialized","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"rt","type":"uint256"},{"name":"rs","type":"uint256"},{"name":"bs","type":"uint256"}],"name":"calculateTrade","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"eth","type":"uint256"},{"name":"contractBalance","type":"uint256"}],"name":"calculateEggBuy","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"marketEggs","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sellEggs","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"seedMarket","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"ref","type":"address"}],"name":"hatchEggs","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getMyEggs","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"lastHatch","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"claimedEggs","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"hatcheryMiners","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"EGGS_TO_HATCH_1MINERS","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"eth","type":"uint256"}],"name":"calculateEggBuySimple","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"eggs","type":"uint256"}],"name":"calculateEggSell","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"referrals","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"ceoAddress2","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"adr","type":"address"}],"name":"getEggsSinceLastHatch","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"ref","type":"address"}],"name":"buyEggs","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"}]


// Create new object
const bnbMinerContract = new web3.eth.Contract(BNB_MINER_ABI, BNB_MINER_CONTRACT)


let isCompoundingCurrently = false

// This script works with BNB
const symbol = 'BNB'

// Create function that can be used to check for compounding oppertunities
const checkOpportunityToCompound = async function(){

    // If the script is currently compounding then do nothing
    if(isCompoundingCurrently) return;

    try{

    // Pause execution until the promise is settled 
    const obtainedRewards = await bnbMinerContract.methods.getEggsSinceLastHatch(wallet.address).call()
    const referralRewards = await bnbMinerContract.methods.claimedEggs(wallet.address).call()


    // Add referral BNB and base BNB mined
    const combinedTotalEggs = parseInt(obtainedRewards)+parseInt(referralRewards)

    // Calculate the BNB value
    const salePrice = await bnbMinerContract.methods.calculateEggSell(combinedTotalEggs.toString()).call()


    // Calculate the final amount of FTM that is mine
    const finalAmount = parseInt(salePrice) 

    // Caluate BNB rewards
    const rewards =  web3.utils.fromWei(finalAmount.toString())

    // Round to 4 dp
    const bnbValue = parseFloat(parseFloat(rewards).toFixed(4))

    // Organise the gas limit and check if we are ready to compound
    const gasLimit = 200000
    const gasPrice = await web3.eth.getGasPrice()

    const txCost = web3.utils.fromWei(gasPrice.toString()) * gasLimit
    
    // We use this to determine what multiple of the tx cost we wanna compound at 
    const multiplierTxCost = 3
    
    // Since the GAS Limit is higher we don't have to have a multiple of the TXCOST
    const threshold = txCost * multiplierTxCost
    // We can compound now 
    if(bnbValue > threshold){
        console.log(`Ready to compound ${bnbValue} ${symbol}`);
        isCompoundingCurrently = true
        compound(gasLimit, gasPrice)
    } else{
        console.log(`Not ready to compound ${bnbValue} ${symbol} as it's not more than ${threshold} ${symbol}`)
    }

   } catch(error){
       console.log(`Failed to call smart contract, try again! ${error.stack}`);
   }

}

const compound = async function(gasLimit, gasPrice){
    // We want to compound if we get to this point so hit the hatch eggs endpoint.
    try{
        console.log('Invoking hatchEggs');

        const hatchEggsTx = await bnbMinerContract.methods.hatchEggs(wallet.address).send(
        {
            from:wallet.address,
            gas:gasLimit,
            gasPrice:gasPrice,

        })
        console.log(`Compound status: ${hatchEggsTx.status}`)
    }catch(error){
        console.log(`Failed to compound with smart contract, try again! ${error.stack}`);
        isCompoundingCurrently = false
        return
    }

    isCompoundingCurrently = false
    console.log("Finished Compounding.")
}

checkOpportunityToCompound()
const POLLING_INTERVAL = 240000 // 4 minutes 
// Ping the endpoint when possible
setInterval(async () => { await checkOpportunityToCompound() },POLLING_INTERVAL)




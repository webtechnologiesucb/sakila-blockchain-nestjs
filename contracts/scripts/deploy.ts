/**
 * =============================================================
 * Smart Contract Deployment Script
 * =============================================================
 * Deploys the PaymentProcessor contract to the configured network
 * (Ganache by default). Run with:
 *
 *   npx hardhat run contracts/scripts/deploy.ts --network ganache
 *
 * After deployment, copy the printed contract address into your
 * .env file as PAYMENT_CONTRACT_ADDRESS.
 * =============================================================
 */
import { ethers } from 'hardhat';

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('PaymentProcessor — Deployment Script');
  console.log('='.repeat(60));

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer address : ${deployer.address}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance : ${ethers.formatEther(balance)} ETH`);

  // Deploy the contract
  console.log('\nDeploying PaymentProcessor...');
  const PaymentProcessor = await ethers.getContractFactory('PaymentProcessor');
  const contract = await PaymentProcessor.deploy();

  // Wait for deployment to complete
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`\n PaymentProcessor deployed successfully!`);
  console.log(`   Contract address: ${contractAddress}`);
  console.log(`   Transaction hash: ${contract.deploymentTransaction()?.hash}`);

  // Verify deployment
  const owner = await contract.owner();
  console.log(`   Contract owner  : ${owner}`);

  console.log('\n' + '='.repeat(60));
  console.log('NEXT STEPS:');
  console.log(`1. Copy the contract address above`);
  console.log(`2. Paste it into your .env file:`);
  console.log(`   PAYMENT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log('3. Restart the NestJS server');
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });

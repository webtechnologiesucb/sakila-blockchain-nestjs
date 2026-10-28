/**
 * =============================================================
 * Hardhat Configuration
 * =============================================================
 * Configures Hardhat for compiling Solidity contracts and
 * deploying them to a local Ganache instance.
 *
 * Network "ganache" targets the local Ganache RPC at port 7545.
 * =============================================================
 */
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ganache: {
      url: process.env.GANACHE_RPC_URL || 'http://127.0.0.1:8545',
      chainId: parseInt(process.env.GANACHE_CHAIN_ID || '1337', 10),
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY ||
          '0xa473ac71bac13c808d2550e6a08eb63c0cb560b5174c1d8b49911d9c51c9cf23',
      ],
    },
    // Hardhat's built-in network (for testing without Ganache)
    hardhat: {
      chainId: 1337,
    },
  },
  paths: {
    sources: './contracts',
    tests: './contracts/test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;

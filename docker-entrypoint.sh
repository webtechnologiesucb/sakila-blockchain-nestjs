#!/bin/sh
set -e

echo "=================================================="
echo "🚀 Sakila Blockchain - Backend Entrypoint Starting"
echo "=================================================="

# 1. Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL at ${DB_HOST:-postgres}:${DB_PORT:-5432}..."
node -e "
const net = require('net');
const host = process.env.DB_HOST || 'postgres';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const start = Date.now();
function check() {
  const socket = net.createConnection({ host, port }, () => {
    console.log('✅ PostgreSQL is reachable!');
    socket.end();
    process.exit(0);
  });
  socket.on('error', (err) => {
    if (Date.now() - start > 60000) {
      console.error('❌ Timeout waiting for PostgreSQL:', err.message);
      process.exit(1);
    }
    setTimeout(check, 1000);
  });
}
check();
"

# 2. Wait for Ganache
echo "⏳ Waiting for Ganache at ${GANACHE_RPC_URL:-http://ganache:8545}..."
node -e "
const http = require('http');
const url = new URL(process.env.GANACHE_RPC_URL || 'http://ganache:8545');
const start = Date.now();
function check() {
  const req = http.request({
    hostname: url.hostname,
    port: url.port || 8545,
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 2000
  }, (res) => {
    console.log('✅ Ganache is reachable!');
    process.exit(0);
  });
  req.on('error', (err) => {
    if (Date.now() - start > 60000) {
      console.error('❌ Timeout waiting for Ganache:', err.message);
      process.exit(1);
    }
    setTimeout(check, 1000);
  });
  req.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }));
  req.end();
}
check();
"

# 3. Compile contracts
echo "🔨 Compiling smart contracts..."
npx hardhat compile

# 4. Check or Deploy contract to Ganache
NEED_DEPLOY=0
if [ -z "$PAYMENT_CONTRACT_ADDRESS" ]; then
  NEED_DEPLOY=1
else
  # Verify if contract bytecode actually exists on Ganache
  node -e "
  const { ethers } = require('ethers');
  async function verify() {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.GANACHE_RPC_URL || 'http://ganache:8545');
      const code = await provider.getCode(process.env.PAYMENT_CONTRACT_ADDRESS);
      if (!code || code === '0x') {
        console.log('Contract has no deployed code on current Ganache instance.');
        process.exit(1);
      }
      console.log('✅ Existing contract verified on-chain at ' + process.env.PAYMENT_CONTRACT_ADDRESS);
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }
  verify();
  " || NEED_DEPLOY=1
fi

if [ "$NEED_DEPLOY" -eq 1 ]; then
  echo "📦 Deploying PaymentProcessor contract to Ganache..."
  npx hardhat run contracts/scripts/deploy.ts --network ganache
fi

# Resolve the deployed contract address for the NestJS runtime.
if [ "$NEED_DEPLOY" -eq 1 ] || [ -z "$PAYMENT_CONTRACT_ADDRESS" ]; then
  if [ -f "artifacts/deployed-address.txt" ]; then
    PAYMENT_CONTRACT_ADDRESS="$(cat artifacts/deployed-address.txt)"
  elif [ -f "contracts/deployed-address.json" ]; then
    PAYMENT_CONTRACT_ADDRESS="$(node -e "const fs=require('fs');try{console.log(JSON.parse(fs.readFileSync('contracts/deployed-address.json','utf8')).address||'')}catch(e){console.log('')}" )"
  fi
fi
export PAYMENT_CONTRACT_ADDRESS
echo "Using PAYMENT_CONTRACT_ADDRESS=${PAYMENT_CONTRACT_ADDRESS}"

# 5. Launch NestJS
echo "🚀 Starting NestJS API server..."
if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
else
  exec node dist/main.js
fi

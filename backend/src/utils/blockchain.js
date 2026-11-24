const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 以太坊 Sepolia 测试网 RPC 地址与托管钱包私钥
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.GETH_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const SEPOLIA_RPC_POOL = [...new Set([
  RPC_URL,
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.gateway.tenderly.co',
  'https://gateway.tenderly.co/public/sepolia',
])];
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || process.env.GETH_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const SEPOLIA_CHAIN_ID = 11155111;

function createSepoliaWallet(rpcUrl = RPC_URL) {
  const req = new ethers.FetchRequest(rpcUrl);
  req.timeout = 8000; // 8秒 HTTP 超时，防止公共 RPC 节点挂起无响应
  const p = new ethers.JsonRpcProvider(req, SEPOLIA_CHAIN_ID, { staticNetwork: true });
  const w = new ethers.Wallet(PRIVATE_KEY, p);
  return { provider: p, wallet: w };
}

// ── 自动从 deployed.json 加载合约地址和 ABI ──
const deployedFilePath = path.join(__dirname, '../../contracts/ResumeEvidence.deployed.json');
let CONTRACT_ADDRESS = null;
let resumeEvidenceABI = null;

if (fs.existsSync(deployedFilePath)) {
  try {
    const deployedInfo = JSON.parse(fs.readFileSync(deployedFilePath, 'utf8'));
    if (!deployedInfo.network || deployedInfo.network === 'sepolia') {
      CONTRACT_ADDRESS = deployedInfo.address;
      resumeEvidenceABI = deployedInfo.abi;
      console.log(`[Blockchain][Sepolia] ✅ 已自动加载合约: ${CONTRACT_ADDRESS} (部署于 ${deployedInfo.deployedAt})`);
    } else {
      console.warn(`[Blockchain][Sepolia] ⚠️ 当前 deployed.json 属于网络 "${deployedInfo.network}"，将使用裸交易降级模式；如需合约存证请运行 node deployContract.js 部署至 Sepolia。`);
    }
  } catch (e) {
    console.error('[Blockchain][Sepolia] ⚠️ 读取 deployed.json 失败:', e.message);
  }
} else {
  // 未部署合约时的降级 ABI（仅用于 fallback 模式）
  resumeEvidenceABI = [
    "function recordApplication(uint256 _applicationId, string _studentId, string _jobId, string _extraData) public",
    "event ApplicationRecorded(uint256 indexed applicationId, string studentId, string jobId, string extraData, uint256 timestamp)"
  ];
  console.warn('[Blockchain][Sepolia] ⚠️ 未找到已部署的合约文件，将使用裸交易降级模式。运行 node deployContract.js 来部署合约。');
}

let provider;
let wallet;

try {
  // staticNetwork: true 可避免节点短暂抖动时 JsonRpcProvider 死循环刷屏 "failed to detect network"
  provider = new ethers.JsonRpcProvider(RPC_URL, SEPOLIA_CHAIN_ID, { staticNetwork: true });
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`[Blockchain][Sepolia] 连接节点: ${RPC_URL}, 账户: ${wallet.address}`);
} catch (e) {
  console.error('[Blockchain][Sepolia] 初始化失败:', e.message);
}

/**
 * 将投递记录存证到链上
 * @param {Number} applicationId 投递ID
 * @param {Number} studentId 学生ID
 * @param {Number} jobId 岗位ID
 * @param {String} extraData 其他附加信息
 * @returns {Promise<String>} 存证成功返回上链的 Transaction Hash
 */
async function sendApplicationEvidence(applicationId, studentId, jobId, extraData = "") {
  if (!wallet) {
    throw new Error('区块链钱包未成功初始化，请检查 Geth 节点和私钥配置。');
  }

  // 未部署合约时降级为裸数据交易模式：携带编码后的 JSON payload 发送自转账交易
  if (!CONTRACT_ADDRESS) {
    console.warn('[Blockchain] 降级模式：发送裸数据交易（无合约）');
    const payloadString = JSON.stringify({ event: 'Apply', applicationId, studentId, jobId, extraData });
    const payloadHex = ethers.hexlify(ethers.toUtf8Bytes(payloadString));
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0,
      data: payloadHex,
    });
    console.log(`[Blockchain] 🔗 裸交易已发送: ${tx.hash}`);
    return tx.hash;
  }

  // 依次尝试 Sepolia RPC 节点池执行合约主通道，单个公链节点偶发 TLS 断开时自动切换备用节点
  let lastContractError = null;
  for (const rpcUrl of SEPOLIA_RPC_POOL) {
    try {
      const { wallet: activeWallet } = createSepoliaWallet(rpcUrl);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, resumeEvidenceABI, activeWallet);
      // 使用 Promise.race 限制广播请求本身的超时，并设置充足的 gasLimit: 800000 跳过缓慢的 eth_estimateGas 往返
      const tx = await Promise.race([
        contract.recordApplication(
          applicationId,
          String(studentId),
          String(jobId),
          String(extraData),
          { gasLimit: 800000 }
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SEND_TX_TIMEOUT')), 10000)),
      ]);
      console.log(`[Blockchain][Sepolia] 🔗 合约交易已发送 (${rpcUrl}): ${tx.hash}，正在等待上链确认...`);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 25000);
      });

      try {
        await Promise.race([tx.wait(1), timeoutPromise]);
        console.log(`[Blockchain][Sepolia] ✅ 交易已确认: ${tx.hash}`);
      } catch (waitError) {
        if (waitError.message === 'TIMEOUT_EXCEEDED') {
          console.warn(`[Blockchain][Sepolia] ⚠️ 确认超时（25s），但交易已广播。Hash: ${tx.hash}`);
        } else {
          throw waitError;
        }
      }

      return tx.hash;
    } catch (error) {
      lastContractError = error;
      console.warn(`[Blockchain][Sepolia] 节点 ${rpcUrl} 合约调用异常 (appId=${applicationId}):`, error.message);
    }
  }

  console.warn(`[Blockchain][Sepolia] 合约主通道全部节点异常 (appId=${applicationId})，降级至裸交易备用通道:`, lastContractError?.message);
  for (const rpcUrl of SEPOLIA_RPC_POOL) {
    try {
      const { wallet: activeWallet } = createSepoliaWallet(rpcUrl);
      const payloadString = JSON.stringify({
        event: 'ApplyFallback',
        applicationId,
        studentId,
        jobId,
        extraData,
        timestamp: Date.now(),
      });
      const payloadHex = ethers.hexlify(ethers.toUtf8Bytes(payloadString));
      const fallbackTx = await activeWallet.sendTransaction({
        to: activeWallet.address,
        value: 0,
        data: payloadHex,
        gasLimit: 150000,
      });
      console.log(`[Blockchain][Sepolia] 🔗 裸交易降级已发送 (${rpcUrl}): ${fallbackTx.hash}`);
      return fallbackTx.hash;
    } catch (fallbackErr) {
      console.warn(`[Blockchain][Sepolia] 裸交易备用节点 ${rpcUrl} 失败:`, fallbackErr.message);
    }
  }
  throw lastContractError || new Error('Sepolia 所有 RPC 节点均不可用');
}

/**
 * 根据交易哈希查询链上详情并解析数据
 * @param {String} txHash 交易哈希
 */
async function getTransactionDetail(txHash) {
  if (!provider) throw new Error('区块链节点未连接');
  
  const tx = await provider.getTransaction(txHash);
  if (!tx) return null;

  let decodedData = null;
  // 如果是合约调用，尝试解析参数
  if (CONTRACT_ADDRESS && tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
    const iface = new ethers.Interface(resumeEvidenceABI);
    try {
      const decoded = iface.parseTransaction({ data: tx.data });
      if (decoded) {
        decodedData = {
          function: decoded.name,
          args: {
            applicationId: decoded.args[0].toString(),
            studentId: decoded.args[1],
            jobId: decoded.args[2],
            extraData: decoded.args[3]
          }
        };
      }
    } catch (e) {
      console.warn('[Blockchain] 解析合约数据失败:', e.message);
    }
  }

  // 如果解析失败或者是降级裸交易，尝试直接 UTF-8 解码 data
  if (!decodedData && tx.data && tx.data !== '0x') {
    try {
      const utf8Body = ethers.toUtf8String(tx.data);
      decodedData = { raw: utf8Body };
    } catch (e) {
      decodedData = { hex: tx.data };
    }
  }

  const receipt = await provider.getTransactionReceipt(txHash);

  return {
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    blockNumber: tx.blockNumber,
    from: tx.from,
    to: tx.to,
    confirmations: tx.confirmations,
    status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
    decodedData
  };
}

module.exports = {
  provider,
  wallet,
  sendApplicationEvidence,
  getTransactionDetail,
};

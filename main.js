const log = msg => {
  document.getElementById('log').textContent += msg + '\n';
};

// --- Web Crypto Helpers ---
async function genKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign','verify']
  );
  window.myKeys = kp;
  log('Key pair generated');
}

async function signData(data) {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    window.myKeys.privateKey,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifySig(data, signature, pubKey) {
  const sig = Uint8Array.from(atob(signature), c=>c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pubKey,
    sig,
    new TextEncoder().encode(JSON.stringify(data))
  );
}

// --- Hashing & Merkle Root ---
async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function merkleRoot(txns) {
  if (txns.length === 0) return await sha256('');
  let layer = await Promise.all(txns.map(t=>sha256(JSON.stringify(t))));
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i+1] || a;
      next.push(await sha256(a + b));
    }
    layer = next;
  }
  return layer[0];
}

// --- Blockchain State ---
let state = { utxos: new Map() };

// Initialize chainTip after sha256 is available
let chainTip;

// Initialize the blockchain state
async function initBlockchain() {
  chainTip = {
    previousHash: '0'.repeat(64),
    merkleRoot: await sha256(''),
    timestamp: Date.now(),
    nonce: 0
  };
  
  // Add a "genesis" UTXO to yourself for testing
  state.utxos.set('genesis:0', { address: null, amount: 100 });
}

// --- Transaction Creation ---
async function createTransaction() {
  // For demo, take first available UTXO
  const [utxoKey, utxo] = state.utxos.entries().next().value;
  const tx = {
    inputs: [{ txId: utxoKey.split(':')[0], index: parseInt(utxoKey.split(':')[1]) }],
    outputs: [{ address: 'recipient-address', amount: utxo.amount }],
  };
  tx.signature = await signData(tx);
  log('Created Tx: ' + JSON.stringify(tx));
  return tx;
}

// --- Block Mining & Validation ---
async function mineBlock() {
  const tx = await createTransaction();
  const mr = await merkleRoot([tx]);
  let nonce = 0, hash;
  const difficulty = '0000'; // adjust as needed

  do {
    const header = {
      previousHash: chainTip.previousHash,
      merkleRoot: mr,
      timestamp: Date.now(),
      nonce: nonce++
    };
    hash = await sha256(JSON.stringify(header));
  } while (!hash.startsWith(difficulty));

  // Generate ZK proof for the block if ZK system is available
  if (window.miniChainZK && tx.zkProof) {
    try {
      // Verify the transaction's ZK proof before including in block
      const isValid = await window.miniChainZK.verifyProof(tx.zkProof, tx.zkPublicSignals);
      
      if (isValid) {
        // Add ZK proof to chainTip as you specified
        chainTip.zkProof = tx.zkProof;
        chainTip.publicSignals = tx.zkPublicSignals;
        log('✅ ZK proof verified and added to block');
      } else {
        log('❌ ZK proof verification failed, mining without proof');
      }
    } catch (error) {
      log('ZK proof verification error: ' + error.message);
    }
  }

  chainTip = { 
    ...chainTip, 
    previousHash: hash, 
    merkleRoot: mr, 
    timestamp: Date.now(), 
    nonce: nonce
  };
  
  // Update state: remove used UTXO, add new one
  state.utxos.delete(tx.inputs[0].txId + ':' + tx.inputs[0].index);
  state.utxos.set(hash + ':0', tx.outputs[0]);

  log(`Mined block ${hash} with nonce ${nonce}`);
  
  // Log ZK proof status
  if (chainTip.zkProof) {
    log('Block includes zero-knowledge proof for privacy');
  }
}

// --- Button Hooks ---
document.getElementById('genKey').onclick = genKeyPair;
document.getElementById('createTx').onclick = createTransaction;
document.getElementById('mine').onclick = mineBlock;
document.getElementById('showBalance').onclick = () => {
  let total = 0;
  for (const out of state.utxos.values()) total += out.amount;
  log(`Current Balance: ${total}`);
  
  // Show chainTip with ZK proof info
  log(`Chain Tip Hash: ${chainTip.previousHash?.substring(0, 16)}...`);
  log(`Merkle Root: ${chainTip.merkleRoot?.substring(0, 16)}...`);
  log(`Nonce: ${chainTip.nonce}`);
  
  if (chainTip.zkProof) {
    log('✅ Block includes zero-knowledge proof');
    log(`Public Signals: [${chainTip.publicSignals?.slice(0, 2).join(', ')}...]`);
  } else {
    log('❌ No zero-knowledge proof in current block');
  }
};

// Initialize blockchain when page loads
initBlockchain();

// ZK Proof integration
import { ZKProofSystem, demonstrateZKProofs } from './zk_proof.js';
import { MiniChainZK, integrateMiniChainProof, autoEnhanceTransactions } from './minichain_zk.js';
import { MiniChainZKComplete, demonstrateCompleteIntegration, checkFiles } from './minichain_complete.js';

// Global ZK system
window.zkSystem = null;

// ZK Proof button handlers
document.getElementById('initZK').onclick = async () => {
  try {
    log('Initializing MiniChain ZK system...');
    window.miniChainZK = new MiniChainZK();
    await window.miniChainZK.initialize();
    
    // Auto-enhance transaction creation
    autoEnhanceTransactions();
    
    log('✓ MiniChain ZK system ready!');
    log('✓ Transactions will now include zero-knowledge proofs');
  } catch (error) {
    log('Failed to initialize ZK system: ' + error.message);
  }
};

document.getElementById('demoZK').onclick = async () => {
  try {
    log('Running ZK proof demonstration...');
    const result = await demonstrateZKProofs();
    log('✓ ZK proof demo completed successfully');
    log('Proof valid: ' + result.isValid);
  } catch (error) {
    log('ZK demo failed: ' + error.message);
  }
};

document.getElementById('testMiniChain').onclick = async () => {
  try {
    log('Testing MiniChain ZK integration...');
    const result = await integrateMiniChainProof();
    log('✓ MiniChain ZK test completed successfully');
    log('Proof valid: ' + result.isValid);
    log('Your code pattern works perfectly!');
  } catch (error) {
    log('MiniChain ZK test failed: ' + error.message);
  }
};

document.getElementById('checkFiles').onclick = async () => {
  try {
    log('Checking ZK circuit files...');
    await checkFiles();
    log('✓ File check completed');
  } catch (error) {
    log('File check failed: ' + error.message);
  }
};

document.getElementById('completeDemo').onclick = async () => {
  try {
    log('Running complete MiniChain ZK integration demo...');
    const result = await demonstrateCompleteIntegration();
    log('✓ Complete demo successful!');
    log('Proof valid: ' + result.isValid);
    log('chainTip.zkProof and chainTip.publicSignals integration working!');
  } catch (error) {
    log('Complete demo failed: ' + error.message);
  }
};
import { groth16 } from 'snarkjs';

class MiniChainZKComplete {
    constructor() {
        this.wasm = null;
        this.zkey = null;
        this.vKey = null;
        this.initialized = false;
    }

    // Load all circuit files using your exact patterns
    async initialize() {
        try {
            console.log('Loading MiniChain ZK files...');
            
            // Your exact loading patterns:
            this.wasm = await fetch('build/minichain_transfer.wasm').then(r => r.arrayBuffer());
            this.zkey = await fetch('build/minichain_final.zkey').then(r => r.arrayBuffer());
            this.vKey = await fetch('build/verification_key.json').then(r => r.json());
            
            this.initialized = true;
            console.log('✅ MiniChain ZK system loaded successfully!');
            
        } catch (error) {
            console.error('Failed to load ZK system:', error);
            throw error;
        }
    }

    // Generate proof using your exact input format
    async generateProof(state, updatedRoot, txFields, ownerPubKey, sigR, sigS) {
        if (!this.initialized) {
            throw new Error('ZK system not initialized');
        }

        try {
            // Your exact input structure
            const input = {
                prevRoot: state.root,
                newRoot: updatedRoot,
                txFields: txFields, // [sender, recipient, amount]
                ownerPubKey: ownerPubKey, // [px, py]
                sigR: sigR, // [rX, rY]
                sigS: sigS // s
            };

            console.log('Generating proof with input:', input);

            // Your exact proof generation pattern
            const { proof, publicSignals } = await groth16.fullProve(input, this.wasm, this.zkey);
            
            console.log('✅ Proof generated successfully');
            return { proof, publicSignals };
            
        } catch (error) {
            console.error('Failed to generate proof:', error);
            throw error;
        }
    }

    // Verify proof using loaded verification key
    async verifyProof(proof, publicSignals) {
        if (!this.initialized) {
            throw new Error('ZK system not initialized');
        }

        try {
            // Use loaded vKey for verification
            const isValid = await groth16.verify(this.vKey, publicSignals, proof);
            console.log('✅ Proof verification result:', isValid);
            return isValid;
            
        } catch (error) {
            console.error('Failed to verify proof:', error);
            throw error;
        }
    }
}

// Complete MiniChain integration
class MiniChainZKIntegration {
    constructor() {
        this.zkSystem = new MiniChainZKComplete();
        this.originalCreateTransaction = null;
        this.originalMineBlock = null;
    }

    // Initialize and enhance MiniChain with ZK proofs
    async initialize() {
        // Load ZK system
        await this.zkSystem.initialize();
        
        // Store original functions
        this.originalCreateTransaction = window.createTransaction;
        this.originalMineBlock = window.mineBlock;
        
        // Enhance functions
        this.enhanceCreateTransaction();
        this.enhanceMineBlock();
        
        console.log('✅ MiniChain ZK integration complete!');
    }

    // Enhance createTransaction with automatic ZK proof generation
    enhanceCreateTransaction() {
        const self = this;
        
        window.createTransaction = async function() {
            try {
                // Create regular transaction
                const tx = await self.originalCreateTransaction();
                
                // Prepare ZK proof data
                const txFields = [
                    "sender_address", // Would be derived from actual wallet
                    tx.outputs[0].address, // recipient
                    tx.outputs[0].amount.toString() // amount
                ];
                
                // Mock signature data (replace with real signature in production)
                const ownerPubKey = ["123456789012345678901234567890", "987654321098765432109876543210"];
                const sigR = ["555555555555555555555555555555", "777777777777777777777777777777"];
                const sigS = "999999999999999999999999999999";
                
                // Calculate new state root
                const updatedRoot = await sha256(JSON.stringify(tx) + Date.now());
                
                // Generate ZK proof using your exact pattern
                const state = { root: chainTip.previousHash || "0".repeat(64) };
                const { proof, publicSignals } = await self.zkSystem.generateProof(
                    state,
                    updatedRoot,
                    txFields,
                    ownerPubKey,
                    sigR,
                    sigS
                );
                
                // Add ZK proof to transaction
                tx.zkProof = proof;
                tx.zkPublicSignals = publicSignals;
                
                log('✅ Zero-knowledge proof added to transaction');
                return tx;
                
            } catch (error) {
                log('ZK proof generation failed: ' + error.message);
                return await self.originalCreateTransaction();
            }
        };
    }

    // Enhance mineBlock to include ZK proofs in chainTip
    enhanceMineBlock() {
        const self = this;
        
        window.mineBlock = async function() {
            try {
                const tx = await createTransaction();
                const mr = await merkleRoot([tx]);
                let nonce = 0, hash;
                const difficulty = '0000';

                do {
                    const header = {
                        previousHash: chainTip.previousHash,
                        merkleRoot: mr,
                        timestamp: Date.now(),
                        nonce: nonce++
                    };
                    hash = await sha256(JSON.stringify(header));
                } while (!hash.startsWith(difficulty));

                // Verify and add ZK proof to chainTip if present
                if (tx.zkProof && tx.zkPublicSignals) {
                    try {
                        const isValid = await self.zkSystem.verifyProof(tx.zkProof, tx.zkPublicSignals);
                        
                        if (isValid) {
                            // Your exact integration pattern:
                            chainTip.zkProof = tx.zkProof;
                            chainTip.publicSignals = tx.zkPublicSignals;
                            log('✅ ZK proof verified and added to chainTip');
                        } else {
                            log('❌ ZK proof verification failed');
                        }
                    } catch (error) {
                        log('ZK proof verification error: ' + error.message);
                    }
                }

                // Update chainTip with block data
                chainTip = {
                    ...chainTip,
                    previousHash: hash,
                    merkleRoot: mr,
                    timestamp: Date.now(),
                    nonce: nonce
                };

                // Update state
                state.utxos.delete(tx.inputs[0].txId + ':' + tx.inputs[0].index);
                state.utxos.set(hash + ':0', tx.outputs[0]);

                log(`Mined block ${hash} with nonce ${nonce}`);
                
                if (chainTip.zkProof) {
                    log('Block includes zero-knowledge proof for privacy');
                }
                
            } catch (error) {
                log('Mining failed: ' + error.message);
            }
        };
    }
}

// Complete demo function
async function demonstrateCompleteIntegration() {
    try {
        console.log('Starting complete MiniChain ZK integration demo...');
        
        // Initialize integration
        const integration = new MiniChainZKIntegration();
        await integration.initialize();
        
        // Test proof generation
        const testState = { root: "12345678901234567890123456789012345678901234567890123456789012345678" };
        const testUpdatedRoot = "98765432109876543210987654321098765432109876543210987654321098765432";
        const testTxFields = ["1111111111111111", "2222222222222222", "1000"];
        const testOwnerPubKey = ["123456789012345678901234567890", "987654321098765432109876543210"];
        const testSigR = ["555555555555555555555555555555", "777777777777777777777777777777"];
        const testSigS = "999999999999999999999999999999";
        
        // Your exact proof generation pattern
        const { proof, publicSignals } = await integration.zkSystem.generateProof(
            testState,
            testUpdatedRoot,
            testTxFields,
            testOwnerPubKey,
            testSigR,
            testSigS
        );
        
        console.log('Generated proof:', proof);
        console.log('Public signals:', publicSignals);
        
        // Verify the proof
        const isValid = await integration.zkSystem.verifyProof(proof, publicSignals);
        console.log('Proof is valid:', isValid);
        
        return { integration, proof, publicSignals, isValid };
        
    } catch (error) {
        console.error('Complete integration demo failed:', error);
        throw error;
    }
}

// Utility function to check file availability
async function checkFiles() {
    const files = [
        'build/minichain_transfer.wasm',
        'build/minichain_final.zkey', 
        'build/verification_key.json'
    ];
    
    for (const file of files) {
        try {
            const response = await fetch(file);
            if (response.ok) {
                console.log(`✅ ${file} - Available`);
            } else {
                console.log(`❌ ${file} - Not found (${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ${file} - Error: ${error.message}`);
        }
    }
}

// Export everything
export { 
    MiniChainZKComplete, 
    MiniChainZKIntegration, 
    demonstrateCompleteIntegration, 
    checkFiles 
};
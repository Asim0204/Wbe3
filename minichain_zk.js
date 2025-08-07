import { groth16 } from 'snarkjs';

class MiniChainZK {
    constructor() {
        this.wasm = null;
        this.zkey = null;
        this.verificationKey = null;
        this.initialized = false;
    }

    // Initialize with your exact file structure
    async initialize() {
        try {
            console.log('Loading MiniChain ZK system...');
            
            // Load circuit files - matches your fetch pattern
            this.wasm = await fetch('build/minichain_transfer.wasm').then(r => r.arrayBuffer());
            this.zkey = await fetch('build/minichain_final.zkey').then(r => r.arrayBuffer());
            this.verificationKey = await fetch('build/minichain_vkey.json').then(r => r.json());
            
            this.initialized = true;
            console.log('✅ MiniChain ZK system ready!');
            
        } catch (error) {
            console.error('Failed to initialize MiniChain ZK:', error);
            throw error;
        }
    }

    // Generate proof using your exact input format
    async generateProof(state, updatedRoot, txFields, ownerPubKey, sigR, sigS) {
        if (!this.initialized) {
            throw new Error('MiniChain ZK not initialized. Call initialize() first.');
        }

        try {
            // Your exact input structure
            const input = {
                prevRoot: state.root,
                newRoot: updatedRoot,
                txFields: txFields, // [sender, recipient, amount]
                ownerPubKey: [ownerPubKey[0], ownerPubKey[1]], // [px, py]
                sigR: [sigR[0], sigR[1]], // [rX, rY]
                sigS: sigS // s
            };

            console.log('Generating ZK proof with input:', input);

            // Your exact proof generation pattern
            const { proof, publicSignals } = await groth16.fullProve(input, this.wasm, this.zkey);
            
            console.log('✅ Proof generated successfully');
            return { proof, publicSignals };
            
        } catch (error) {
            console.error('Failed to generate proof:', error);
            throw error;
        }
    }

    // Verify proof
    async verifyProof(proof, publicSignals) {
        if (!this.initialized) {
            throw new Error('MiniChain ZK not initialized');
        }

        try {
            const isValid = await groth16.verify(this.verificationKey, publicSignals, proof);
            console.log('✅ Proof verification result:', isValid);
            return isValid;
            
        } catch (error) {
            console.error('Failed to verify proof:', error);
            throw error;
        }
    }

    // Helper to create sample data for testing
    createSampleData() {
        return {
            state: { root: "12345678901234567890123456789012345678901234567890123456789012345678" },
            updatedRoot: "98765432109876543210987654321098765432109876543210987654321098765432",
            txFields: ["1111111111111111", "2222222222222222", "1000"], // [sender, recipient, amount]
            ownerPubKey: ["123456789012345678901234567890", "987654321098765432109876543210"], // [px, py]
            sigR: ["555555555555555555555555555555", "777777777777777777777777777777"], // [rX, rY]
            sigS: "999999999999999999999999999999" // s
        };
    }
}

// Integration with your MiniChain blockchain
async function integrateMiniChainProof() {
    // Initialize ZK system
    const zkSystem = new MiniChainZK();
    await zkSystem.initialize();
    
    // Example of how to use with your state
    const sampleData = zkSystem.createSampleData();
    
    try {
        // Generate proof using your exact pattern
        const { proof, publicSignals } = await zkSystem.generateProof(
            sampleData.state,
            sampleData.updatedRoot,
            sampleData.txFields,
            sampleData.ownerPubKey,
            sampleData.sigR,
            sampleData.sigS
        );
        
        console.log('Generated proof:', proof);
        console.log('Public signals:', publicSignals);
        
        // Verify the proof
        const isValid = await zkSystem.verifyProof(proof, publicSignals);
        console.log('Proof is valid:', isValid);
        
        return { zkSystem, proof, publicSignals, isValid };
        
    } catch (error) {
        console.error('Integration test failed:', error);
        throw error;
    }
}

// Enhanced transaction creation with ZK proofs
function enhanceCreateTransaction() {
    // Store original function
    const originalCreateTransaction = window.createTransaction;
    
    // Enhanced version with ZK proofs
    window.createTransaction = async function() {
        try {
            // Create regular transaction
            const tx = await originalCreateTransaction();
            
            // Only add ZK proof if system is initialized
            if (window.miniChainZK && window.miniChainZK.initialized) {
                // Extract transaction data for ZK proof
                const txFields = [
                    "sender_address",  // Would be derived from actual sender
                    tx.outputs[0].address, // recipient
                    tx.outputs[0].amount.toString() // amount
                ];
                
                // Mock signature data (in real implementation, use actual signature)
                const ownerPubKey = ["123456789012345678901234567890", "987654321098765432109876543210"];
                const sigR = ["555555555555555555555555555555", "777777777777777777777777777777"];
                const sigS = "999999999999999999999999999999";
                
                // Calculate new root (simplified)
                const updatedRoot = await sha256(JSON.stringify(tx) + Date.now());
                
                // Generate ZK proof using your exact pattern
                const { proof, publicSignals } = await window.miniChainZK.generateProof(
                    { root: chainTip.previousHash || "0".repeat(64) },
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
            } else {
                log('ZK system not initialized, creating regular transaction');
            }
            
            return tx;
            
        } catch (error) {
            log('ZK proof generation failed: ' + error.message);
            // Fallback to regular transaction
            return await originalCreateTransaction();
        }
    };
}

// Auto-enhance createTransaction when ZK system is ready
function autoEnhanceTransactions() {
    if (typeof window !== 'undefined' && window.createTransaction) {
        enhanceCreateTransaction();
        log('✅ Transaction creation enhanced with ZK proofs');
    }
}

// Export for use
export { MiniChainZK, integrateMiniChainProof, enhanceCreateTransaction, autoEnhanceTransactions };
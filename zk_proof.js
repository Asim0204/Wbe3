import { groth16 } from 'snarkjs';

class ZKProofSystem {
    constructor() {
        this.wasm = null;
        this.zkey = null;
        this.verificationKey = null;
        this.initialized = false;
    }

    // Initialize the proof system by loading circuit files
    async initialize() {
        try {
            console.log('Loading ZK proof system files...');
            
            // Load WASM circuit
            this.wasm = await fetch('build/transfer_js/transfer.wasm').then(r => r.arrayBuffer());
            console.log('✓ WASM circuit loaded');
            
            // Load proving key
            this.zkey = await fetch('build/transfer_final.zkey').then(r => r.arrayBuffer());
            console.log('✓ Proving key loaded');
            
            // Load verification key
            this.verificationKey = await fetch('build/verification_key.json').then(r => r.json());
            console.log('✓ Verification key loaded');
            
            this.initialized = true;
            console.log('🎉 ZK proof system initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize ZK proof system:', error);
            throw error;
        }
    }

    // Generate a zero-knowledge proof for a transfer transaction
    async generateTransferProof(transferData) {
        if (!this.initialized) {
            throw new Error('ZK proof system not initialized. Call initialize() first.');
        }

        try {
            console.log('Generating ZK proof for transfer...');
            
            // Prepare circuit inputs
            const input = {
                prevRoot: transferData.prevRoot,
                newRoot: transferData.newRoot,
                nullifierHash: transferData.nullifierHash,
                commitmentHash: transferData.commitmentHash,
                amount: transferData.amount.toString(),
                fromAddress: transferData.fromAddress,
                toAddress: transferData.toAddress,
                nonce: transferData.nonce.toString(),
                signature: transferData.signature,
                merklePathElements: transferData.merklePathElements,
                merklePathIndices: transferData.merklePathIndices
            };

            console.log('Circuit input prepared:', input);

            // Generate the proof
            const { proof, publicSignals } = await groth16.fullProve(
                input,
                this.wasm,
                this.zkey
            );

            console.log('✓ Proof generated successfully');
            console.log('Public signals:', publicSignals);

            return {
                proof,
                publicSignals,
                input: input // Include input for debugging
            };

        } catch (error) {
            console.error('Failed to generate proof:', error);
            throw error;
        }
    }

    // Verify a zero-knowledge proof
    async verifyProof(proof, publicSignals) {
        if (!this.initialized) {
            throw new Error('ZK proof system not initialized. Call initialize() first.');
        }

        try {
            console.log('Verifying ZK proof...');
            
            const isValid = await groth16.verify(this.verificationKey, publicSignals, proof);
            
            console.log('✓ Proof verification result:', isValid);
            return isValid;
            
        } catch (error) {
            console.error('Failed to verify proof:', error);
            throw error;
        }
    }

    // Helper method to create sample transfer data for testing
    createSampleTransfer() {
        return {
            prevRoot: "12345678901234567890123456789012345678901234567890123456789012345678",
            newRoot: "98765432109876543210987654321098765432109876543210987654321098765432", 
            nullifierHash: "11111111111111111111111111111111111111111111111111111111111111111111",
            commitmentHash: "22222222222222222222222222222222222222222222222222222222222222222222",
            amount: 1000,
            fromAddress: "1234567890123456789012345678901234567890",
            toAddress: "9876543210987654321098765432109876543210",
            nonce: 42,
            signature: "555555555555555555555555555555555555555555555555555555555555555555",
            merklePathElements: [
                "1111111111111111111111111111111111111111111111111111111111111111111",
                "2222222222222222222222222222222222222222222222222222222222222222222", 
                "3333333333333333333333333333333333333333333333333333333333333333333",
                "4444444444444444444444444444444444444444444444444444444444444444444",
                "5555555555555555555555555555555555555555555555555555555555555555555",
                "6666666666666666666666666666666666666666666666666666666666666666666",
                "7777777777777777777777777777777777777777777777777777777777777777777",
                "8888888888888888888888888888888888888888888888888888888888888888888",
                "9999999999999999999999999999999999999999999999999999999999999999999",
                "1010101010101010101010101010101010101010101010101010101010101010101"
            ],
            merklePathIndices: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
        };
    }
}

// Example usage function
async function demonstrateZKProofs() {
    const zkSystem = new ZKProofSystem();
    
    try {
        // Initialize the system
        await zkSystem.initialize();
        
        // Create sample transfer data
        const transferData = zkSystem.createSampleTransfer();
        console.log('Sample transfer data:', transferData);
        
        // Generate proof
        const proofResult = await zkSystem.generateTransferProof(transferData);
        console.log('Generated proof:', proofResult.proof);
        
        // Verify proof
        const isValid = await zkSystem.verifyProof(proofResult.proof, proofResult.publicSignals);
        console.log('Proof is valid:', isValid);
        
        return { zkSystem, proofResult, isValid };
        
    } catch (error) {
        console.error('Demo failed:', error);
        throw error;
    }
}

// Integration with MiniChain blockchain
function integrateMiniChainZK() {
    // Add ZK proof generation to transaction creation
    const originalCreateTransaction = window.createTransaction;
    
    window.createTransaction = async function() {
        try {
            // Generate regular transaction
            const tx = await originalCreateTransaction();
            
            // Initialize ZK system if not already done
            if (!window.zkSystem) {
                window.zkSystem = new ZKProofSystem();
                await window.zkSystem.initialize();
            }
            
            // Generate ZK proof for the transaction
            const transferData = {
                prevRoot: chainTip.previousHash,
                newRoot: await sha256(JSON.stringify(tx)),
                nullifierHash: await sha256(tx.inputs[0].txId + tx.inputs[0].index),
                commitmentHash: await sha256(JSON.stringify(tx.outputs[0])),
                amount: tx.outputs[0].amount,
                fromAddress: "sender", // Would be derived from keys
                toAddress: tx.outputs[0].address,
                nonce: Date.now(),
                signature: tx.signature,
                merklePathElements: new Array(10).fill("0"),
                merklePathIndices: new Array(10).fill(0)
            };
            
            const proofResult = await window.zkSystem.generateTransferProof(transferData);
            
            // Add proof to transaction
            tx.zkProof = proofResult.proof;
            tx.zkPublicSignals = proofResult.publicSignals;
            
            log('✓ ZK proof added to transaction');
            return tx;
            
        } catch (error) {
            log('Failed to generate ZK proof: ' + error.message);
            return await originalCreateTransaction(); // Fallback to regular transaction
        }
    };
}

// Export for use
export { ZKProofSystem, demonstrateZKProofs, integrateMiniChainZK };
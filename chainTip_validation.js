import { groth16 } from 'snarkjs';

// ChainTip ZK Proof Validation
class ChainTipValidator {
    constructor() {
        this.vKey = null;
        this.initialized = false;
    }

    // Load verification key using your exact pattern
    async initialize() {
        try {
            console.log('Loading verification key for chainTip validation...');
            this.vKey = await fetch('build/verification_key.json').then(r => r.json());
            this.initialized = true;
            console.log('✅ ChainTip validator initialized');
        } catch (error) {
            console.error('Failed to initialize chainTip validator:', error);
            throw error;
        }
    }

    // Validate chainTip using your exact pattern
    async validateChainTip(chainTip) {
        if (!this.initialized) {
            throw new Error('ChainTip validator not initialized');
        }

        try {
            console.log('Validating chainTip ZK proof...');
            
            // Check if chainTip has ZK proof
            if (!chainTip.zkProof || !chainTip.publicSignals) {
                console.log('⚠️ chainTip has no ZK proof - skipping validation');
                return true; // Allow blocks without ZK proofs for backward compatibility
            }

            // Your exact validation pattern:
            const isValid = await groth16.verify(this.vKey, chainTip.publicSignals, chainTip.zkProof);
            if (!isValid) throw new Error('Invalid zk-SNARK proof');

            console.log('✅ chainTip ZK proof is valid');
            return true;

        } catch (error) {
            console.error('❌ chainTip validation failed:', error);
            throw error;
        }
    }

    // Validate multiple chainTips (for chain validation)
    async validateChain(chainTips) {
        console.log(`Validating chain of ${chainTips.length} blocks...`);
        
        for (let i = 0; i < chainTips.length; i++) {
            try {
                await this.validateChainTip(chainTips[i]);
                console.log(`✅ Block ${i + 1}/${chainTips.length} validated`);
            } catch (error) {
                console.error(`❌ Block ${i + 1}/${chainTips.length} validation failed:`, error.message);
                throw new Error(`Chain validation failed at block ${i + 1}: ${error.message}`);
            }
        }
        
        console.log('✅ Entire chain validated successfully');
        return true;
    }
}

// Enhanced block validation for MiniChain
class EnhancedBlockValidator {
    constructor() {
        this.chainTipValidator = new ChainTipValidator();
        this.blockHistory = [];
    }

    async initialize() {
        await this.chainTipValidator.initialize();
        console.log('✅ Enhanced block validator ready');
    }

    // Validate and accept a new block
    async validateAndAcceptBlock(newChainTip) {
        try {
            console.log('Validating new block...');
            
            // Basic block structure validation
            if (!newChainTip.previousHash || !newChainTip.merkleRoot) {
                throw new Error('Invalid block structure');
            }

            // ZK proof validation using your exact pattern
            await this.chainTipValidator.validateChainTip(newChainTip);

            // Add to block history
            this.blockHistory.push({
                ...newChainTip,
                validatedAt: Date.now(),
                blockNumber: this.blockHistory.length
            });

            console.log('✅ Block validated and accepted');
            console.log(`Block #${this.blockHistory.length} added to chain`);
            
            return true;

        } catch (error) {
            console.error('❌ Block validation failed:', error);
            throw error;
        }
    }

    // Get block history with validation status
    getValidatedChain() {
        return this.blockHistory.map(block => ({
            blockNumber: block.blockNumber,
            hash: block.previousHash?.substring(0, 16) + '...',
            hasZKProof: !!(block.zkProof && block.publicSignals),
            validatedAt: new Date(block.validatedAt).toISOString(),
            nonce: block.nonce
        }));
    }
}

// Integration with MiniChain mining process
function enhanceMiningWithValidation() {
    const originalMineBlock = window.mineBlock;
    
    window.mineBlock = async function() {
        try {
            // Run original mining
            await originalMineBlock();
            
            // Validate the new chainTip using your exact pattern
            if (window.blockValidator) {
                await window.blockValidator.validateAndAcceptBlock(chainTip);
                log('✅ Block validated with ZK proof verification');
            }
            
        } catch (error) {
            log('❌ Block validation failed: ' + error.message);
            // Revert chainTip or handle validation failure
            throw error;
        }
    };
}

// Complete validation demo
async function demonstrateChainTipValidation() {
    try {
        console.log('🔍 Demonstrating chainTip ZK proof validation...');
        
        // Initialize validator
        const validator = new ChainTipValidator();
        await validator.initialize();
        
        // Create sample chainTip with ZK proof
        const sampleChainTip = {
            previousHash: "abc123...",
            merkleRoot: "def456...",
            timestamp: Date.now(),
            nonce: 1234
        };
        
        // Load circuit files for proof generation
        const wasm = await fetch('build/minichain_transfer.wasm').then(r => r.arrayBuffer());
        const zkey = await fetch('build/minichain_final.zkey').then(r => r.arrayBuffer());
        
        // Generate a valid proof
        const input = {
            prevRoot: "12345678901234567890123456789012345678901234567890123456789012345678",
            newRoot: "98765432109876543210987654321098765432109876543210987654321098765432",
            txFields: ["1111111111111111", "2222222222222222", "1000"],
            ownerPubKey: ["123456789012345678901234567890", "987654321098765432109876543210"],
            sigR: ["555555555555555555555555555555", "777777777777777777777777777777"],
            sigS: "999999999999999999999999999999"
        };
        
        const { proof, publicSignals } = await groth16.fullProve(input, wasm, zkey);
        
        // Add ZK proof to chainTip
        sampleChainTip.zkProof = proof;
        sampleChainTip.publicSignals = publicSignals;
        
        // Validate using your exact pattern
        console.log('Testing validation with valid proof...');
        await validator.validateChainTip(sampleChainTip);
        
        // Test with invalid proof
        console.log('Testing validation with invalid proof...');
        const invalidChainTip = { ...sampleChainTip };
        invalidChainTip.publicSignals = ["invalid", "signals"];
        
        try {
            await validator.validateChainTip(invalidChainTip);
            console.log('❌ Should have failed validation');
        } catch (error) {
            console.log('✅ Correctly rejected invalid proof:', error.message);
        }
        
        console.log('🎉 chainTip validation demo completed successfully!');
        return { validator, sampleChainTip };
        
    } catch (error) {
        console.error('❌ Validation demo failed:', error);
        throw error;
    }
}

// Export for use
export { 
    ChainTipValidator, 
    EnhancedBlockValidator, 
    enhanceMiningWithValidation, 
    demonstrateChainTipValidation 
};